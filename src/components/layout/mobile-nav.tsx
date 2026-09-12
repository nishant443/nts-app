"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { LogoLockup } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Slide-in navigation for screens below `lg`.
 *
 * Closes on route change and on Escape, and locks body scroll while open so
 * the page behind cannot be scrolled away under the overlay.
 */
export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A completed navigation should always leave the drawer closed — including
  // one the user triggered with the back button. Adjusting during render (React's
  // documented pattern for resetting state when a prop changes) avoids the extra
  // commit an effect would cause.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!open}
        // Keeps the closed drawer out of the tab order and off-limits to
        // screen readers while it is translated off-screen.
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(17rem,85vw)] flex-col",
          "border-r border-border bg-surface shadow-overlay",
          "transition-transform duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
          <LogoLockup />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
