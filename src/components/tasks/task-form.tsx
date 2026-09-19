"use client";

import { useActionState } from "react";

import { saveTask } from "@/app/actions/tasks";
import { CustomerPicker } from "@/components/customers/customer-picker";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Field,
  FormActions,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { humanizeEnum } from "@/lib/utils";

export function TaskForm({
  values,
  employees,
  customers,
  priorities,
  mailConfigured,
}: {
  values: {
    id?: string;
    title: string;
    description: string;
    assigneeId: string;
    priority: string;
    dueDate: string;
    customerId: string;
  };
  employees: { id: string; label: string }[];
  customers: { id: string; label: string }[];
  priorities: readonly string[];
  mailConfigured: boolean;
}) {
  const [state, formAction] = useActionState(saveTask, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Task"
          description={
            mailConfigured
              ? "The employee gets an in-app notification and an email with everything below."
              : "The employee gets an in-app notification. Email is not set up, so no mail will be sent."
          }
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Assign to"
              htmlFor="assigneeId"
              required
              error={fieldError(state, "assigneeId")}
            >
              <Select
                id="assigneeId"
                name="assigneeId"
                defaultValue={values.assigneeId}
                required
                invalid={Boolean(fieldError(state, "assigneeId"))}
              >
                <option value="">Choose an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Priority"
              htmlFor="priority"
              required
              error={fieldError(state, "priority")}
            >
              <Select
                id="priority"
                name="priority"
                defaultValue={values.priority}
                required
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {humanizeEnum(priority)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Due date"
              htmlFor="dueDate"
              error={fieldError(state, "dueDate")}
              hint="Leave blank if there is no deadline."
            >
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={values.dueDate}
                invalid={Boolean(fieldError(state, "dueDate"))}
              />
            </Field>

            <Field
              label="Customer"
              htmlFor="customerId"
              hint="Link the site so the engineer knows where to go."
            >
              <CustomerPicker
                id="customerId"
                name="customerId"
                customers={customers}
                defaultValue={values.customerId}
                emptyLabel="Not customer-specific"
              />
            </Field>

            <Field
              label="Title"
              htmlFor="title"
              required
              className="sm:col-span-2"
              error={fieldError(state, "title")}
            >
              <Input
                id="title"
                name="title"
                defaultValue={values.title}
                required
                placeholder="Service call — VMC spindle vibration at Ace Precision"
                invalid={Boolean(fieldError(state, "title"))}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              required
              className="sm:col-span-2"
              error={fieldError(state, "description")}
              hint="What needs doing, where, and anything the engineer should bring or know. This goes in the email verbatim."
            >
              <Textarea
                id="description"
                name="description"
                rows={8}
                defaultValue={values.description}
                required
                invalid={Boolean(fieldError(state, "description"))}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <FormActions>
        <Button
          href={values.id ? `/tasks/${values.id}` : "/tasks"}
          variant="ghost"
        >
          Cancel
        </Button>
        <SubmitButton pendingLabel={values.id ? "Saving…" : "Assigning…"}>
          {values.id ? "Save changes" : "Assign task"}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
