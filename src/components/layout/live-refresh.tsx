"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };

    const onVisible = () => {
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
