"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * Status buttons for a document.
 *
 * Each option calls a Server Action that re-validates the transition on the
 * server, so a disabled button here is a convenience, never the control.
 */
export function StatusActions({
  current,
  options,
  onChange,
  id,
}: {
  current: string;
  options: { value: string; label: string }[];
  /** Server Action taking `{ id, status }`. */
  onChange: (input: {
    id: string;
    status: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  id: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const select = (status: string) => {
    if (status === current) return;

    startTransition(async () => {
      const result = await onChange({ id, status });
      if (result.ok) {
        toast.success("Status updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div
      role="group"
      aria-label="Change status"
      className="flex flex-wrap items-center gap-1.5"
    >
      {pending && (
        <Loader2
          aria-hidden="true"
          className="size-4 animate-spin text-fg-subtle"
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => select(option.value)}
          disabled={pending || option.value === current}
          aria-pressed={option.value === current}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors",
            option.value === current
              ? "cursor-default border-accent bg-accent-soft text-accent"
              : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
            pending && "opacity-60",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
