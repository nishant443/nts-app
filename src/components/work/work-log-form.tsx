"use client";

import { useActionState } from "react";

import { saveWorkLog } from "@/app/actions/work";
import { CustomerPicker } from "@/components/customers/customer-picker";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Field,
  FormActions,
  FormGrid,
  Input,
  Textarea,
} from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

export function WorkLogForm({
  values,
  customers,
}: {
  values: {
    id?: string;
    date: string;
    title: string;
    description: string;
    hoursSpent: string;
    customerId: string;
  };
  customers: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(saveWorkLog, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Work report"
          description="Describe what was done — this is what gets reviewed and billed."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Date"
              htmlFor="date"
              required
              error={fieldError(state, "date")}
            >
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={values.date}
                required
                invalid={Boolean(fieldError(state, "date"))}
              />
            </Field>

            <Field
              label="Hours spent"
              htmlFor="hoursSpent"
              required
              error={fieldError(state, "hoursSpent")}
              hint="Use decimals, e.g. 7.5 for seven and a half hours."
            >
              <Input
                id="hoursSpent"
                name="hoursSpent"
                inputMode="decimal"
                defaultValue={values.hoursSpent}
                required
                className="tnum"
                invalid={Boolean(fieldError(state, "hoursSpent"))}
              />
            </Field>

            <Field
              label="Customer"
              htmlFor="customerId"
              hint="Link the visit so the work can be billed."
              className="sm:col-span-2"
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
                placeholder="Preventive maintenance — spindle and way lube inspection"
                invalid={Boolean(fieldError(state, "title"))}
              />
            </Field>

            <Field
              label="What was done"
              htmlFor="description"
              required
              className="sm:col-span-2"
              error={fieldError(state, "description")}
              hint="Observations, parts used, and the state the machine was left in."
            >
              <Textarea
                id="description"
                name="description"
                rows={7}
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
          href={values.id ? `/work-logs/${values.id}` : "/work-logs"}
          variant="ghost"
        >
          Cancel
        </Button>
        <SubmitButton>
          {values.id ? "Save report" : "Submit report"}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
