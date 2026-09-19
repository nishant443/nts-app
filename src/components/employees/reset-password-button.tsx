"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { resetEmployeePassword } from "@/app/actions/employees";
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
  const [issued, setIssued] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    startTransition(async () => {
      const result = await resetEmployeePassword({ id: employeeId });
      setConfirming(false);

      if (result.ok) {
        setIssued(result.data.temporaryPassword);
        showSuccess(`${employeeName} has been signed out of all devices.`);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (issued) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent-soft px-3.5 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
          Temporary password
        </p>
        <p className="tnum mt-1 select-all font-mono text-[15px] font-semibold text-fg">
          {issued}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
          Share this with {employeeName} securely and ask them to change it
          after signing in. It will not be shown again.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-fg">
          Reset {employeeName}&apos;s password? They will be signed out
          everywhere and will need the new password to sign back in.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={reset} disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {pending ? "Resetting…" : "Reset password"}
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
      Reset password
    </Button>
  );
}
