import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/login/auth-shell";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const NOTICES: Record<string, { title: string; body: string }> = {
  inactive: {
    title: "Account Deactivated",
    body: "You have been signed out. Contact Admin.",
  },
  stale: {
    title: "Signed out",
    body: "Your session ended because your password, role or sign-in changed. Sign in again.",
  },
  reset: {
    title: "Password updated",
    body: "Your new password is set and every other device has been signed out. Sign in with it now.",
  },
};

export default async function LoginPage(props: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice } = await props.searchParams;
  const banner = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <AuthShell
      footer={
        <>
          Forgotten your password?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            Reset it by email
          </Link>
        </>
      }
    >
      <LoginForm notice={banner} />
    </AuthShell>
  );
}
