"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { formAction, formError, type FormState } from "@/lib/action";
import { fakePasswordCheck, hashPassword, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/dal";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { changePasswordSchema, loginSchema } from "@/lib/validation";
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
    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      "unknown";

    enforceRateLimit(
      `login:email:${email}`,
      RateLimits.login.limit,
      RateLimits.login.windowSeconds,
    );
    enforceRateLimit(
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
