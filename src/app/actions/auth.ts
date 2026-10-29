"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { formAction, formError, type FormState } from "@/lib/action";
import { fakePasswordCheck, hashPassword, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/dal";
import { hashResetToken, issuePasswordReset } from "@/lib/password-reset";
import {
  clientIp,
  enforceSharedRateLimit,
  RateLimits,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { RateLimitError } from "@/lib/errors";

export async function signIn(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return formError("Enter your email address and password.");
  }

  const { email, password } = parsed.data;

  try {
    const ip = clientIp(await headers());

    await enforceSharedRateLimit(
      `login:email:${email}`,
      RateLimits.login.limit,
      RateLimits.login.windowSeconds,
    );
    await enforceSharedRateLimit(
      `login:ip:${ip}`,
      RateLimits.login.limit * 3,
      RateLimits.login.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return formError(
        "Too many sign-in attempts. Please wait a few minutes and try again.",
      );
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      status: true,
      sessionVersion: true,
      deactivationReason: true,
    },
  });

  const GENERIC_FAILURE = "That email address and password do not match.";

  if (!user) {
    await fakePasswordCheck(password);
    return formError(GENERIC_FAILURE);
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    await recordAudit({
      userId: user.id,
      action: "auth.login_failed",
      entity: "Auth",
      entityId: user.id,
    });
    return formError(GENERIC_FAILURE);
  }

  if (user.status !== "ACTIVE") {
    await recordAudit({
      userId: user.id,
      action: "auth.login_blocked",
      entity: "Auth",
      entityId: user.id,
      meta: { status: user.status },
    });
    return formError(deactivatedMessage(user));
  }

  await createSession({
    userId: user.id,
    role: user.role,
    sv: user.sessionVersion,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    userId: user.id,
    action: "auth.login",
    entity: "Auth",
    entityId: user.id,
  });

  redirect("/dashboard");
}

function deactivatedMessage(user: {
  status: "INACTIVE" | "SUSPENDED" | "ACTIVE";
  deactivationReason: string | null;
}): string {
  const state = user.status === "SUSPENDED" ? "Suspended" : "Deactivated";
  const reason = user.deactivationReason?.trim().replace(/[.!?]+$/, "");

  return reason
    ? `Account ${state}: ${reason}. Contact Admin.`
    : `Account ${state}. Contact Admin.`;
}

export async function signOut(): Promise<void> {
  const user = await getSessionUser();

  if (user) {
    // Revokes every copy of the session token, not just this browser's cookie.
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });

    await recordAudit({
      userId: user.id,
      action: "auth.logout",
      entity: "Auth",
      entityId: user.id,
    });
  }

  await destroySession();
  redirect("/login");
}

export const changePassword = formAction(
  { access: "user", schema: changePasswordSchema },
  async ({ input, user }) => {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, role: true },
    });

    if (!record) return formError("Your account could not be found.");

    const valid = await verifyPassword(input.currentPassword, record.passwordHash);
    if (!valid) {
      return formError("Your current password is incorrect.", {
        currentPassword: ["Your current password is incorrect."],
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true, role: true },
    });

    await createSession({
      userId: user.id,
      role: updated.role,
      sv: updated.sessionVersion,
    });

    await recordAudit({
      userId: user.id,
      action: "auth.password_changed",
      entity: "Auth",
      entityId: user.id,
    });

    return {
      success: "Your password has been updated.",
      ts: Date.now(),
    };
  },
);

const RESET_REQUESTED =
  "If that email belongs to an active NTS account, a reset link is on its way. It expires in 30 minutes.";

export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return formError("Enter a valid email address.", {
      email: ["Enter a valid email address."],
    });
  }

  const { email } = parsed.data;

  try {
    const ip = clientIp(await headers());
    await enforceSharedRateLimit(
      `reset:email:${email}`,
      RateLimits.passwordReset.limit,
      RateLimits.passwordReset.windowSeconds,
    );
    await enforceSharedRateLimit(
      `reset:ip:${ip}`,
      RateLimits.passwordReset.limit * 3,
      RateLimits.passwordReset.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return formError(
        "Too many reset requests. Please wait a few minutes and try again.",
      );
    }
    throw error;
  }

  // The lookup and email happen after the response is sent, so the reply and
  // its timing are identical whether or not the address has an account.
  after(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, status: true },
      });
      if (!user || user.status !== "ACTIVE") return;

      await issuePasswordReset(user, { requestedByAdmin: false });
      await recordAudit({
        userId: user.id,
        action: "auth.password_reset_requested",
        entity: "Auth",
        entityId: user.id,
      });
    } catch (error) {
      console.error("[auth] password reset request failed", error);
    }
  });

  return { success: RESET_REQUESTED, ts: Date.now() };
}

const INVALID_RESET_LINK =
  "This reset link is invalid or has expired. Request a new one.";

export async function resetPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
      string,
      string[]
    >;
    if (fieldErrors.token) return formError(INVALID_RESET_LINK);
    return formError("Please correct the highlighted fields.", fieldErrors);
  }

  try {
    await enforceSharedRateLimit(
      `reset-submit:ip:${clientIp(await headers())}`,
      RateLimits.passwordReset.limit * 2,
      RateLimits.passwordReset.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return formError("Too many attempts. Please wait a few minutes and try again.");
    }
    throw error;
  }

  const { token, newPassword } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { status: true } },
    },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt <= new Date() ||
    record.user.status !== "ACTIVE"
  ) {
    return formError(INVALID_RESET_LINK);
  }

  const passwordHash = await hashPassword(newPassword);

  const claimed = await prisma.$transaction(async (tx) => {
    // Claiming the token inside the transaction means two simultaneous
    // submissions of the same link cannot both succeed.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    });
    return true;
  });

  if (!claimed) return formError(INVALID_RESET_LINK);

  await recordAudit({
    userId: record.userId,
    action: "auth.password_reset",
    entity: "Auth",
    entityId: record.userId,
  });

  await destroySession();
  redirect("/login?notice=reset");
}
