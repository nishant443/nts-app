import type { Metadata } from "next";

import { LogoAdaptive } from "@/components/brand/logo";
import { LoginForm } from "@/app/login/login-form";
import { VisualPanel } from "@/app/login/visual-panel";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Why the visitor landed here without asking to — set by `/api/auth/expire`
 * when a cookie stopped mapping to a usable account.
 */
const NOTICES: Record<string, { title: string; body: string }> = {
  inactive: {
    title: "Account Deactivated",
    body: "You have been signed out. Contact Admin.",
  },
  stale: {
    title: "Signed out",
    body: "Your password was changed. Sign in again with the new one.",
  },
};

/**
 * Sign-in screen: one large rounded card floating on a muted ground. The form
 * sits on a soft gradient on the left; the right half is a visual panel with
 * floating glimpses of the product. On phones only the form remains.
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice } = await props.searchParams;
  const banner = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#dfe5ee] p-3 sm:p-6 lg:p-8 dark:bg-[#0a0f18]">
      <div className="animate-in-up grid w-full max-w-[80rem] overflow-hidden rounded-[1.75rem] bg-surface shadow-[0_40px_90px_-30px_rgb(16_24_40/0.45)] sm:rounded-[2.25rem] lg:min-h-[min(46rem,calc(100dvh/var(--ui-zoom)-4rem))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Form side --------------------------------------------------- */}
        <section className="relative flex flex-col bg-[linear-gradient(165deg,#f8fafc_0%,#eef4ff_55%,#dfeaff_100%)] px-6 pb-8 pt-7 sm:px-10 sm:pb-9 sm:pt-8 dark:bg-[linear-gradient(165deg,#151b23_0%,#131c2c_55%,#10203a_100%)]">
          <div className="flex items-center justify-between">
            <LogoAdaptive className="h-11 sm:h-12" priority />
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[24rem]">
              <LoginForm notice={banner} />
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-fg-subtle">
            <p>
              Forgotten your password?{" "}
              <span className="font-medium text-fg-muted">Ask your administrator.</span>
            </p>
            <p>© {new Date().getFullYear()} Nutan Tech Solutions</p>
          </footer>
        </section>

        {/* Visual side — hidden on phones, where it would push the form
            below the fold. */}
        <VisualPanel />
      </div>
    </main>
  );
}
