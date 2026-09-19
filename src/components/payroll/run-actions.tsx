"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { generatePayslips, setPayrollStatus } from "@/app/actions/payroll";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/components/ui/success-popup";

export function RunActions({
  runId,
  status,
  payslipCount,
}: {
  runId: string;
  status: string;
  payslipCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = status === "DRAFT" || status === "PROCESSING";

  const generate = () => {
    startTransition(async () => {
      const result = await generatePayslips({ id: runId });
      if (result.ok) {
        showSuccess("Payslips generated from the latest data.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      {open && (
        <Button variant="secondary" onClick={generate} disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {pending
            ? "Generating…"
            : payslipCount > 0
              ? "Regenerate payslips"
              : "Generate payslips"}
        </Button>
      )}

      {open && payslipCount > 0 && (
        <ConfirmAction
          action={setPayrollStatus}
          input={{ id: runId, status: "FINALIZED" }}
          title="Finalize this payroll run?"
          body="The figures will be locked and every employee will be notified that their payslip is ready. You can reopen the run afterwards if something needs correcting."
          confirmLabel="Finalize and publish"
          variant="primary"
          successMessage="Payroll finalized. Employees have been notified."
          trigger="Finalize"
        />
      )}

      {status === "FINALIZED" && (
        <>
          <ConfirmAction
            action={setPayrollStatus}
            input={{ id: runId, status: "PAID" }}
            title="Mark as paid?"
            body="Records that salaries for this month have been transferred."
            confirmLabel="Mark paid"
            variant="primary"
            successMessage="Payroll marked as paid."
            trigger="Mark as paid"
          />

          <ConfirmAction
            action={setPayrollStatus}
            input={{ id: runId, status: "PROCESSING" }}
            title="Reopen this run?"
            body="The run goes back to processing so payslips can be corrected. Employees keep seeing the current figures until you finalize again."
            confirmLabel="Reopen"
            variant="ghost"
            successMessage="Payroll run reopened."
            trigger="Reopen"
          />
        </>
      )}
    </>
  );
}
