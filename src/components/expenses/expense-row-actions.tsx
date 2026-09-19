"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { deleteExpense } from "@/app/actions/work";
import { ConfirmAction } from "@/components/documents/confirm-action";

export function ExpenseRowActions({
  id,
  pending,
}: {
  id: string;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/expenses/${id}/edit`}
        aria-label="Edit expense"
        className="inline-flex size-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <Pencil aria-hidden="true" className="size-4" />
      </Link>

      {pending && (
        <ConfirmAction
          action={deleteExpense}
          input={{ id }}
          title="Delete this claim?"
          body="The expense will be removed. This cannot be undone."
          confirmLabel="Delete"
          variant="ghost"
          size="sm"
          className="text-fg-subtle hover:bg-danger-soft hover:text-danger"
          successMessage="Expense deleted."
          trigger={
            <>
              <Trash2 aria-hidden="true" />
              <span className="sr-only">Delete expense</span>
            </>
          }
        />
      )}
    </div>
  );
}
