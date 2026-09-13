"use client";

import { useActionState } from "react";
import { CheckCircle2, Play } from "lucide-react";

import { progressTask } from "@/app/actions/tasks";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

/**
 * The assignee's controls: one button to start, then a note and a button to
 * finish. Rendered only while the task is OPEN or IN_PROGRESS.
 */
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
        title={status === "OPEN" ? "Start this task" : "Finish this task"}
        description={
          status === "OPEN"
            ? "Mark it started so your administrator knows it is in hand."
            : "Add a short note on what was done, then mark it complete."
        }
      />
      <CardBody>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="id" value={taskId} />
          <input
            type="hidden"
            name="status"
            value={status === "OPEN" ? "IN_PROGRESS" : "COMPLETED"}
          />

          <FormBanners state={state} />

          {status === "IN_PROGRESS" && (
            <Field
              label="Completion note"
              htmlFor="note"
              error={fieldError(state, "note")}
              hint="Optional — parts used, observations, anything to follow up."
            >
              <Textarea
                id="note"
                name="note"
                rows={4}
                invalid={Boolean(fieldError(state, "note"))}
              />
            </Field>
          )}

          <div className="flex justify-end">
            <SubmitButton
              pendingLabel={status === "OPEN" ? "Starting…" : "Completing…"}
            >
              {status === "OPEN" ? (
                <>
                  <Play aria-hidden="true" />
                  Start task
                </>
              ) : (
                <>
                  <CheckCircle2 aria-hidden="true" />
                  Mark complete
                </>
              )}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
