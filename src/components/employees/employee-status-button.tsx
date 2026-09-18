"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { setEmployeeStatus } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { showSuccess } from "@/components/ui/success-popup";

/**
 * Deactivate / reactivate an employee's account.
 *
 * Deactivating asks for confirmation and an optional reason in a modal, since
 * it signs the person out everywhere on the spot. The reason is what they will
 * read the next time they try to sign in, so the prompt says as much.
 */
export function EmployeeStatusButton({
  employeeId,
  employeeName,
  active,
  isSelf,
}: {
  employeeId: string;
  employeeName: string;
  active: boolean;
  /** An admin cannot deactivate their own account. */
  isSelf: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const titleId = useId();
  const reasonId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = (nextActive: boolean) => {
    startTransition(async () => {
      const result = await setEmployeeStatus({
        id: employeeId,
        active: nextActive,
        reason: nextActive ? undefined : reason,
      });

      if (result.ok) {
        showSuccess(
          nextActive
            ? `${employeeName} can sign in again.`
            : `${employeeName} has been deactivated and signed out everywhere.`,
        );
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  };

  if (!active) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => submit(true)}
        disabled={pending}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <UserRoundCheck aria-hidden="true" />
        )}
        {pending ? "Reactivating…" : "Reactivate"}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="dangerSoft"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isSelf}
        title={isSelf ? "You cannot deactivate your own account." : undefined}
      >
        <UserRoundX aria-hidden="true" />
        Deactivate
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="w-[min(28rem,calc(100vw/var(--ui-zoom)-2rem))] rounded-xl border border-border bg-surface p-0 text-fg shadow-overlay backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit(false);
          }}
        >
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <h2 id={titleId} className="text-[15px] font-semibold text-fg">
                Deactivate {employeeName}?
              </h2>
              <p className="text-[13.5px] leading-relaxed text-fg-muted">
                They will be signed out of every device immediately and will not
                be able to sign in until you reactivate them. Nothing is deleted
                — their attendance, work reports, payslips and other records
                stay exactly as they are.
              </p>
            </div>

            <Field
              label="Reason (optional)"
              htmlFor={reasonId}
              hint="Shown to them if they try to sign in."
            >
              <Textarea
                id={reasonId}
                name="reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Resigned — last working day 30 Sep 2026"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              {pending ? "Deactivating…" : "Deactivate account"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
