"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps server-rendered pages current without a manual reload.
 *
 * Pages fetch their data when they render and then sit still; changes made
 * by *other* people (an employee completing a task, a check-in, a leave
 * request) would not show until the admin navigated or pressed F5. This
 * re-fetches server data quietly:
 *
 *   - when the tab regains focus or becomes visible again
 *   - every `intervalMs` while the tab is visible
 *
 * `router.refresh()` is a soft refresh: Server Components re-render with
 * fresh data, client state (form inputs, open dialogs, scroll) is kept.
 * Hidden tabs never poll, so a forgotten window costs nothing.
 */
export function LiveRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };

    const onVisible = () => {
      // Skip if we refreshed moments ago (e.g. focus + visibility both firing).
      if (document.visibilityState === "visible" && Date.now() - last > 3_000) {
        refresh();
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) refresh();
    }, intervalMs);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
