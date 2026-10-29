// PWA plumbing shared by the service-worker manager and the install button.
// Everything is off in development so `next dev` is never served from cache.

export const PWA_ENABLED = process.env.NODE_ENV === "production";

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "local";

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPadOS 13+ reports itself as a Mac, so also check for a touch screen.
export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// --- Install prompt store ----------------------------------------------------
// beforeinstallprompt can fire before the account menu mounts (for example on
// /login), so it is captured as soon as this module loads in the browser and
// components subscribe to it.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null; // a prompt event can only be used once
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

if (typeof window !== "undefined" && PWA_ENABLED) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // our own "Install app" button is shown instead
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}
