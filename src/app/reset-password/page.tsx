import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/login/auth-shell";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      footer={
        <>
          Link expired?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            Request a new one
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
