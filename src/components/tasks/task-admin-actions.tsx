"use client";

import { Ban } from "lucide-react";

import { cancelTask } from "@/app/actions/tasks";
import { ConfirmAction } from "@/components/documents/confirm-action";

/** Admin-only: withdraw a task that has not been completed. */
export function CancelTaskButton({ id }: { id: string }) {
  return (
    <ConfirmAction
      action={cancelTask}
      input={{ id }}
      title="Cancel this task?"
      body="The employee will be told it is no longer needed. The task stays on record as cancelled."
      confirmLabel="Cancel task"
      variant="danger"
      successMessage="Task cancelled."
      trigger={
        <>
          <Ban aria-hidden="true" />
          Cancel task
        </>
      }
    />
  );
}
