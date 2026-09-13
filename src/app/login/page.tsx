import type { Metadata } from "next";

import { LogoAdaptive } from "@/components/brand/logo";
import { BrandPanel } from "@/app/login/brand-panel";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
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

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
