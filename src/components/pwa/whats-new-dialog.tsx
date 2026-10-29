"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BUILD_ID, PWA_ENABLED } from "@/lib/pwa";
import { LATEST_RELEASE } from "@/lib/releases";

const STORAGE_KEY = "nts_last_seen_release";

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function unseen(): boolean {
  return (
    PWA_ENABLED &&
    LATEST_RELEASE !== undefined &&
    readLastSeen() !== LATEST_RELEASE.version
  );
}

const noop = () => () => {};

// Shows the latest release notes once per version. Mounted in the app shell,
// so only signed-in users see it.
export function WhatsNewDialog() {
  const shouldShow = useSyncExternalStore(noop, unseen, () => false);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = shouldShow && !dismissed;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  const release = LATEST_RELEASE;
  if (!release || !open) return null;

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, release.version);
    } catch {
      // Storage unavailable (private mode): the dialog may show again, which is harmless.
    }
    dialogRef.current?.close();
    setDismissed(true);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      aria-labelledby="whats-new-title"
      className="max-w-[min(28rem,calc(100vw/var(--ui-zoom)-2rem))] rounded-xl border border-border bg-surface p-0 text-fg shadow-overlay backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id="whats-new-title" className="text-[15px] font-semibold text-fg">
          What&apos;s new in NTS {release.version}
        </h2>
        <ul className="flex flex-col gap-3">
          {release.notes.map((note) => (
            <li key={note} className="flex gap-3 text-[13.5px] leading-relaxed text-fg-muted">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-fg-subtle">
          Released {release.date} · build {BUILD_ID}
        </p>
      </div>

      <div className="flex justify-end border-t border-border px-5 py-3.5">
        <Button variant="primary" onClick={close}>
          Got it
        </Button>
      </div>
    </dialog>
  );
}
