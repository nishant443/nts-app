import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";
import { GlobalSearch } from "@/components/layout/global-search";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  NotificationBell,
  NotificationBellFallback,
} from "@/components/layout/notification-bell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme";
import { UserMenu } from "@/components/layout/user-menu";
import { FlashPopup } from "@/components/ui/success-popup";
import type { SessionUser } from "@/lib/dal";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border px-4">
          <Link
            href="/dashboard"
            className="min-w-0 rounded-lg transition-opacity hover:opacity-80"
          >
            <LogoLockup />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav role={user.role} />
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="text-[11px] leading-relaxed text-fg-subtle">
            Precision Restored,
            <br />
            Performance Assured
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] shrink-0 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md sm:px-5">
          <MobileNav role={user.role} />

          <Link
            href="/dashboard"
            className="min-w-0 rounded-lg transition-opacity hover:opacity-80 lg:hidden"
          >
            <LogoLockup />
          </Link>

          <div className="hidden min-w-0 flex-1 sm:block">
            <GlobalSearch />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <Suspense fallback={<NotificationBellFallback />}>
              <NotificationBell userId={user.id} />
            </Suspense>
            <UserMenu
              name={user.name}
              email={user.email}
              role={user.role}
              avatarUrl={user.avatarUrl}
            />
          </div>
        </header>

        <div className="border-b border-border bg-surface px-3 py-2 sm:hidden">
          <GlobalSearch />
        </div>

        <FlashPopup />
        <LiveRefresh />

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
          <div className="mx-auto flex min-w-0 max-w-[92rem] flex-col gap-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
