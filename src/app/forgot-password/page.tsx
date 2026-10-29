import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { AuthShell } from "@/app/login/auth-shell";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
