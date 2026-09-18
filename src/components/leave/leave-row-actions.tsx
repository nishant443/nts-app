"use client";

import { X } from "lucide-react";

import { cancelLeaveRequest } from "@/app/actions/leave";
import { ConfirmAction } from "@/components/documents/confirm-action";

/** Withdraw a pending leave request. */
export function LeaveRowActions({ id }: { id: string }) {
  return (
    <ConfirmAction
      action={cancelLeaveRequest}
      input={{ id }}
      title="Withdraw this request?"
      body="The request will be cancelled. You can submit a new one for the same dates afterwards."
      confirmLabel="Withdraw"
      variant="dangerSoft"
      size="sm"
      successMessage="Leave request withdrawn."
      trigger={
        <>
          <X aria-hidden="true" />
          Withdraw
        </>
      }
    />
  );
}
