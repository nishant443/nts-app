"use client";

import { useActionState, useState } from "react";
import { Banknote, Check, MessageSquare, X } from "lucide-react";

import { SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { emptyFormState, type FormState } from "@/lib/form-state";

/**
 * Approve / reject control used by all three approval queues.
 *
 * The note field is revealed on demand rather than always taking up space —
 * most approvals need no comment, but a rejection almost always does, so
 * choosing "Reject" opens it automatically.
 *
 * The three choices are tinted so they can be told apart at a glance: green
 * for approve, red for reject, plain for the optional third step.
 */
export function ReviewPanel({
  action,
  id,
  extraChoice,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  /** Third option, e.g. marking an expense reimbursed. */
  extraChoice?: { value: string; label: string };
}) {
  const [state, formAction] = useActionState(action, emptyFormState);
  const [decision, setDecision] = useState<string | null>(null);

  if (!decision) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {state.error && (
          <span className="text-[12px] font-medium text-danger">
            {state.error}
          </span>
        )}

        <Button
          variant="success"
          size="sm"
          onClick={() => setDecision("APPROVED")}
        >
          <Check aria-hidden="true" />
          Approve
        </Button>

        <Button
          variant="dangerSoft"
          size="sm"
          onClick={() => setDecision("REJECTED")}
        >
          <X aria-hidden="true" />
          Reject
        </Button>

        {extraChoice && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDecision(extraChoice.value)}
          >
            <Banknote aria-hidden="true" />
            {extraChoice.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:min-w-[22rem]"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />

      <label
        htmlFor={`note-${id}`}
        className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted"
      >
        <MessageSquare aria-hidden="true" className="size-3.5" />
        {decision === "REJECTED"
          ? "Why is this being rejected?"
          : "Add a note (optional)"}
      </label>

      <Input
        id={`note-${id}`}
        name="reviewNote"
        autoFocus
        placeholder={
          decision === "REJECTED"
            ? "Two engineers already on leave that week."
            : "Optional comment"
        }
      />

      {state.error && (
        <p className="text-[12px] font-medium text-danger">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDecision(null)}
        >
          Cancel
        </Button>
        <SubmitButton
          variant={decision === "REJECTED" ? "danger" : "primary"}
          pendingLabel="Saving…"
        >
          Confirm{" "}
          {decision === "APPROVED"
            ? "approval"
            : decision === "REJECTED"
              ? "rejection"
              : extraChoice?.label.toLowerCase()}
        </SubmitButton>
      </div>
    </form>
  );
}
