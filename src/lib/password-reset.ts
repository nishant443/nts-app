import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { env, isProduction } from "@/lib/env";
import { isMailConfigured, passwordResetEmail, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export const RESET_TTL = {
  selfService: { ms: 30 * 60 * 1000, label: "30 minutes" },
  adminIssued: { ms: 24 * 60 * 60 * 1000, label: "24 hours" },
} as const;

// Only the hash is stored, so a database leak does not hand out working links.
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordReset(
  user: { id: string; name: string; email: string },
  options: { requestedByAdmin: boolean },
): Promise<void> {
  const ttl = options.requestedByAdmin
    ? RESET_TTL.adminIssued
    : RESET_TTL.selfService;
  const token = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + ttl.ms),
      },
    }),
  ]);

  // The token travels in the fragment, which browsers never send to a server,
  // so it stays out of access logs and Referer headers.
  const link = `${env.NEXT_PUBLIC_APP_URL}/reset-password#token=${token}`;

  if (!isMailConfigured()) {
    if (!isProduction) console.info("[password-reset] SMTP not set up. Link:", link);
    else console.warn("[password-reset] SMTP not set up; reset link not sent");
    return;
  }

  const settings = await getCompanySettings();
  const { subject, text, html } = passwordResetEmail({
    recipientName: user.name,
    link,
    expiresInLabel: ttl.label,
    requestedByAdmin: options.requestedByAdmin,
    companyName: settings.name,
  });

  await sendMail({ to: user.email, subject, text, html });
}
