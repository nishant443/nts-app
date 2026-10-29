"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";

export const authInputClass =
  "h-[3.25rem] w-full rounded-full border bg-white/80 px-5 text-[15px] text-fg outline-none " +
  "shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-[border-color,box-shadow,background-color] " +
  "placeholder:text-fg-subtle focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/15 " +
  "dark:bg-white/5 dark:focus:bg-white/10";

export function AuthSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group mt-1 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-fg shadow-[0_10px_24px_-8px_rgb(26_109_255/0.6)] transition-[background-color,transform,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-[0_14px_28px_-8px_rgb(26_109_255/0.6)] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-[18px] animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight
            aria-hidden="true"
            className="size-[18px] transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </>
      )}
    </button>
  );
}
