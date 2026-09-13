import type { Metadata } from "next";

import { LogoAdaptive } from "@/components/brand/logo";
import { BrandPanel } from "@/app/login/brand-panel";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Why the visitor landed here without asking to — set by `/api/auth/expire`
 * when a cookie stopped mapping to a usable account.
 */
const NOTICES: Record<string, { title: string; body: string }> = {
  inactive: {
    title: "Your account has been deactivated",
    body: "An administrator has deactivated your account, so you have been signed out. Contact your administrator if you think this is a mistake.",
  },
  stale: {
    title: "You were signed out",
    body: "Your password was changed or reset on another device. Sign in again with your new password.",
  },
};

export default async function LoginPage(props: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice } = await props.searchParams;
  const banner = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side — hidden on phones, where it would push the form below
          the fold. */}
      <BrandPanel />

      {/* Sign-in side --------------------------------------------------- */}
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        {/* A whisper of the brand colour so the light side is not flat white. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_circle_at_100%_0%,var(--accent-soft),transparent_60%)] opacity-70 dark:opacity-30"
        />

        <div className="animate-in-up relative w-full max-w-[22.5rem]">
          {/* On phones the logo sits above the form instead of in a side panel. */}
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoAdaptive className="h-16" priority />
          </div>

          <LoginForm notice={banner} />
        </div>
      </section>
    </main>
  );
}
