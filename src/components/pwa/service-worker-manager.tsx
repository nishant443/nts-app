"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PWA_ENABLED } from "@/lib/pwa";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Registers the service worker and shows a banner when a new deploy is
// waiting. The new worker only takes over when the user clicks "Update now".
export function ServiceWorkerManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!PWA_ENABLED) {
      // Remove any worker left behind by a local production build so dev is
      // never served stale files.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()));
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let intervalId: number | undefined;
    let reloading = false;

    // A controller means an older version is running; without one this is
    // the first install and there is nothing to update from.
    const showIfWaiting = (worker: ServiceWorker | null) => {
      if (worker && navigator.serviceWorker.controller) setWaitingWorker(worker);
    };

    const trackInstalling = (worker: ServiceWorker | null) => {
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") showIfWaiting(worker);
      });
    };

    const checkForUpdate = () => {
      registration?.update().catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    // Reload only after the user asked for the update, and only once.
    const onControllerChange = () => {
      if (!updateRequested.current || reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        showIfWaiting(reg.waiting);
        trackInstalling(reg.installing);
        reg.addEventListener("updatefound", () => trackInstalling(reg.installing));
        intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      })
      .catch((error) => console.error("Service worker registration failed", error));

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!waitingWorker) return null;

  const applyUpdate = () => {
    updateRequested.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in-up fixed inset-x-4 bottom-4 z-[60] rounded-xl border border-border bg-surface p-4 shadow-overlay sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <RefreshCw aria-hidden="true" className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            A new version of NTS is available.
          </p>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">
            Save any unsaved work before updating.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" onClick={applyUpdate}>
              Update now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWaitingWorker(null)}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
