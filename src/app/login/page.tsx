import type { Metadata } from "next";

import { LogoAdaptive } from "@/components/brand/logo";
import { LoginForm } from "@/app/login/login-form";
import { VisualPanel } from "@/app/login/visual-panel";

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
    body: "Your password was changed. Sign in again with the new one.",
  },
};

export default async function LoginPage(props: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice } = await props.searchParams;
  const banner = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#dfe5ee] p-3 sm:p-5 dark:bg-[#0a0f18]">
      <div className="animate-in-up grid w-full max-w-[80rem] overflow-hidden rounded-[1.75rem] bg-surface shadow-[0_40px_90px_-30px_rgb(16_24_40/0.45)] sm:rounded-[2.25rem] lg:h-[max(36rem,calc(100dvh/var(--ui-zoom)-2.5rem))] lg:grid-cols-2">
        <section className="relative flex min-h-0 flex-col bg-[linear-gradient(165deg,#f8fafc_0%,#eef4ff_55%,#dfeaff_100%)] px-6 pb-6 pt-6 sm:px-10 sm:pb-7 sm:pt-7 dark:bg-[linear-gradient(165deg,#151b23_0%,#131c2c_55%,#10203a_100%)]">
          <div className="flex items-center justify-between">
            <LogoAdaptive className="h-11 sm:h-12" priority />
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-6">
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

        <VisualPanel />
      </div>
    </main>
  );
}
