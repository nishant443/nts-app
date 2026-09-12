"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonVariant } from "@/components/ui/button";

/**
 * Button that asks before running a destructive or irreversible Server Action.
 *
 * Uses the native `<dialog>` so focus trapping, Escape-to-close and the top
 * layer come from the platform rather than being re-implemented.
 */
export function ConfirmAction<TInput>({
  action,
  input,
  title,
  body,
  confirmLabel,
  trigger,
  variant = "secondary",
  size,
  successMessage,
  /** Where to go after success; defaults to refreshing in place. */
  redirectTo,
}: {
  action: (
    input: TInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  input: TInput;
  title: string;
  body: string;
  confirmLabel: string;
  trigger: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  successMessage?: string;
  redirectTo?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const confirm = () => {
    startTransition(async () => {
      const result = await action(input);

      if (result.ok) {
        if (successMessage) toast.success(successMessage);
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {trigger}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="max-w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-fg shadow-overlay backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-2 p-5">
          <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
          <p className="text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={confirm}
            disabled={pending}
          >
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
