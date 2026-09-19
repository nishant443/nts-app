"use client";

import { useActionState } from "react";
import { CheckCircle2, Play } from "lucide-react";

import { progressTask } from "@/app/actions/tasks";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

export function TaskProgressForm({
  taskId,
  status,
}: {
  taskId: string;
  status: "OPEN" | "IN_PROGRESS";
}) {
  const [state, formAction] = useActionState(progressTask, emptyFormState);

  return (
    <Card>
      <CardHeader
        title="Update this task"
        description={
          status === "OPEN"
            ? "Start it so your administrator knows it is in hand, or mark it complete once the work is done."
            : "Add a short note on what was done, then mark it complete. Your administrator is notified straight away."
        }
      />
      <CardBody>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="id" value={taskId} />

          <FormBanners state={state} />

          <Field
            label="Completion note"
            htmlFor="note"
            error={fieldError(state, "note")}
            hint="Optional — parts used, observations, anything to follow up. Sent to your administrator with the completion notice."
          >
            <Textarea
              id="note"
              name="note"
              rows={4}
              invalid={Boolean(fieldError(state, "note"))}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {status === "OPEN" && (
              <SubmitButton
                name="status"
                value="IN_PROGRESS"
                variant="secondary"
                pendingLabel="Saving…"
              >
                <Play aria-hidden="true" />
                Start task
              </SubmitButton>
            )}
            <SubmitButton
              name="status"
              value="COMPLETED"
              pendingLabel="Saving…"
            >
              <CheckCircle2 aria-hidden="true" />
              Mark complete
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
