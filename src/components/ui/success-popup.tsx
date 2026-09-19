"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FLASH_COOKIE } from "@/lib/flash-cookie";

interface Popup {
  id: number;
  title: string;
  message: string;
}

const AUTO_CLOSE_MS = 4000;

let current: Popup | null = null;
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showSuccess(message: string, title = "Saved") {
  current = { id: ++counter, title, message };
  emit();
}

function dismiss() {
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

export function SuccessPopupHost() {
  const popup = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (popup && !dialog.open) dialog.showModal();
    if (!popup && dialog.open) dialog.close();
    if (popup) dialog.querySelector("button")?.focus();
  }, [popup]);

  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(dismiss, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [popup]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="success-popup-title"
      onClose={dismiss}
      onClick={(event) => {
        if (event.target === dialogRef.current) dismiss();
      }}
      className="w-[min(22rem,calc(100vw/var(--ui-zoom)-2rem))] rounded-2xl border border-border bg-surface p-0 text-fg shadow-overlay backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      {popup && (
        <div
          key={popup.id}
          className="animate-in-up flex flex-col items-center gap-3 px-6 pb-5 pt-7 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 aria-hidden="true" className="size-8" />
          </span>
          <div className="flex flex-col gap-1">
            <h2
              id="success-popup-title"
              className="text-[17px] font-semibold text-fg"
            >
              {popup.title}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-fg-muted">
              {popup.message}
            </p>
          </div>
          <Button variant="primary" onClick={dismiss} className="mt-2 min-w-28">
            OK
          </Button>
          <span
            aria-hidden="true"
            className="popup-timer mt-1 h-1 w-full rounded-full bg-success/60"
            style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }}
          />
        </div>
      )}
    </dialog>
  );
}

export function FlashPopup() {
  const pathname = usePathname();

  const consume = useCallback(() => {
    const match = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${FLASH_COOKIE}=`));
    if (!match) return;

    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;

    try {
      const message = decodeURIComponent(match.slice(FLASH_COOKIE.length + 1));
      if (message) showSuccess(message);
    } catch {
    }
  }, []);

  useEffect(() => {
    consume();
  }, [pathname, consume]);

  return null;
}

export function useSuccessPopup(state: {
  success?: string | null;
  ts?: number;
}) {
  const seen = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.success || state.ts === undefined) return;
    if (seen.current === state.ts) return;
    seen.current = state.ts;
    showSuccess(state.success);
  }, [state.success, state.ts]);
}
