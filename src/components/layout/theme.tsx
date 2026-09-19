"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "nts-theme";

type Theme = "light" | "dark" | "system";

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
  }
  return "system";
}

function serverTheme(): Theme {
  return "system";
}

function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readStoredTheme, serverTheme);
}

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
    () => "light" as const,
  );
}

function setTheme(next: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
  }

  const dark =
    next === "dark" ||
    (next === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  emit();
}

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
    <script dangerouslySetInnerHTML={{ __html: script }} />
  );
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

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
