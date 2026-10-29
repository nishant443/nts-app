"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { sendPasswordResetLink } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/components/ui/success-popup";

export function ResetPasswordButton({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const send = () => {
    startTransition(async () => {
      const result = await sendPasswordResetLink({ id: employeeId });
      setConfirming(false);

      if (result.ok) {
        showSuccess(`A reset link was emailed to ${result.data.email}.`);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-fg">
          Email {employeeName} a link to set a new password? The link works
          once and expires in 24 hours. Their current password keeps working
          until they use it.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={send} disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
      <KeyRound aria-hidden="true" />
      Send reset link
    </Button>
  );
}
