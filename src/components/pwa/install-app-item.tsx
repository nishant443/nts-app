"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

import {
  canPromptInstall,
  isIOS,
  isStandalone,
  promptInstall,
  PWA_ENABLED,
  subscribeInstallPrompt,
} from "@/lib/pwa";

type InstallMode = "prompt" | "ios" | null;

function installMode(): InstallMode {
  if (!PWA_ENABLED || isStandalone()) return null;
  if (canPromptInstall()) return "prompt";
  return isIOS() ? "ios" : null;
}

// "Install app" for browsers with an install prompt (Chrome, Edge, Android)
// and an Add to Home Screen hint for iOS, which has no prompt API. Hidden once
// the app is installed or when the browser offers neither.
export function InstallAppItem({ onDone }: { onDone: () => void }) {
  const mode = useSyncExternalStore(subscribeInstallPrompt, installMode, () => null);
  const [showHint, setShowHint] = useState(false);

  if (!mode) return null;

  const onClick = () => {
    if (mode === "ios") {
      setShowHint((value) => !value);
      return;
    }
    onDone();
    void promptInstall();
  };

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        aria-expanded={mode === "ios" ? showHint : undefined}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <Download aria-hidden="true" className="size-4" />
        Install app
      </button>
      {mode === "ios" && showHint && (
        <p className="mx-3.5 mb-2 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] leading-relaxed text-fg">
          <Share aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>
            Tap <span className="font-semibold">Share</span>, then{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </span>
        </p>
      )}
    </>
  );
}
