"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Theme handling.
 *
 * The choice lives in `localStorage` under `nts-theme` and is applied by an
 * inline script before first paint (see `ThemeScript`), so there is no flash of
 * the wrong theme on load. "system" follows the OS.
 *
 * State is read with `useSyncExternalStore` rather than an effect: localStorage
 * and `prefers-color-scheme` are external stores, and the hook gives correct
 * server snapshots and cross-tab updates without a post-mount re-render.
 */

const STORAGE_KEY = "nts-theme";

type Theme = "light" | "dark" | "system";

// --- External store ----------------------------------------------------------

/** Same-tab subscribers; `storage` events only fire in *other* tabs. */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Private mode or blocked storage — fall through to the default.
  }
  return "system";
}

/** Server render has no storage and no media query; "system" is the neutral default. */
function serverTheme(): Theme {
  return "system";
}

function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readStoredTheme, serverTheme);
}

/** The theme actually in effect, with "system" resolved against the OS. */
function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribe,
    () => {
      const stored = readStoredTheme();
      if (stored !== "system") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },
    // Matches what `ThemeScript` assumes before hydration, so the first client
    // render agrees with the server HTML.
    () => "light" as const,
  );
}

function setTheme(next: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing to persist to; the class change below still applies for this page.
  }

  const dark =
    next === "dark" ||
    (next === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  emit();
}

// --- Components --------------------------------------------------------------

/**
 * Runs before hydration. Kept deliberately tiny and dependency-free because it
 * is inlined into the document head and blocks the first paint.
 */
export function ThemeScript() {
  const script = `
(function(){
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var dark = stored === 'dark' ||
      ((!stored || stored === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();`.trim();

  return (
    // The content is a fixed literal — no user input reaches it.
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Three-way segmented control, used on the Settings page. */
export function ThemeSelector() {
  const theme = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-lg border border-border bg-surface-inset p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors",
              selected
                ? "bg-surface text-fg shadow-card"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact light/dark toggle for the topbar. */
export function ThemeToggle() {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-[18px]" />
      ) : (
        <Moon aria-hidden="true" className="size-[18px]" />
      )}
    </button>
  );
}
