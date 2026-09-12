"use client";

import { useActionState, useState } from "react";

import { submitLeaveRequest } from "@/app/actions/leave";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Checkbox,
  Field,
  FormActions,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { humanizeEnum } from "@/lib/utils";

const LEAVE_TYPES = [
  "CASUAL",
  "SICK",
  "EARNED",
  "COMP_OFF",
  "MATERNITY",
  "UNPAID",
] as const;

export function LeaveRequestForm({
  defaultDate,
  balances,
}: {
  defaultDate: string;
  balances: { type: string; remaining: number }[];
}) {
  const [state, formAction] = useActionState(submitLeaveRequest, emptyFormState);

  const [type, setType] = useState<string>("CASUAL");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [halfDay, setHalfDay] = useState(false);

  const remaining = balances.find((balance) => balance.type === type)?.remaining;

  // Keep the end date from drifting behind the start date as people edit.
  const onStartChange = (value: string) => {
    setStartDate(value);
    if (endDate < value) setEndDate(value);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormBanners state={state} />

      <Card>
        <CardHeader title="Leave details" />
        <CardBody>
          <FormGrid>
            <Field
              label="Type of leave"
              htmlFor="type"
              hint={
                remaining !== undefined
                  ? `${remaining} day(s) remaining this year.`
                  : type === "UNPAID"
                    ? "Unpaid leave is deducted from pay."
                    : undefined
              }
            >
              <Select
                id="type"
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {LEAVE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {humanizeEnum(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Half day"
              htmlFor="halfDay"
              hint="A half day must start and end on the same date."
            >
              <div className="flex h-10 items-center">
                <Checkbox
                  id="halfDay"
                  name="halfDay"
                  checked={halfDay}
                  onChange={(event) => {
                    setHalfDay(event.target.checked);
                    if (event.target.checked) setEndDate(startDate);
                  }}
                  label="This is a half day"
                />
              </div>
            </Field>

            <Field
              label="From"
              htmlFor="startDate"
              required
              error={fieldError(state, "startDate")}
            >
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => onStartChange(event.target.value)}
                required
                invalid={Boolean(fieldError(state, "startDate"))}
              />
            </Field>

            <Field
              label="To"
              htmlFor="endDate"
              required
              error={fieldError(state, "endDate")}
            >
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={endDate}
                min={startDate}
                disabled={halfDay}
                onChange={(event) => setEndDate(event.target.value)}
                required
                invalid={Boolean(fieldError(state, "endDate"))}
              />
            </Field>

            <Field
              label="Reason"
              htmlFor="reason"
              required
              className="sm:col-span-2"
              error={fieldError(state, "reason")}
              hint="A short explanation helps your administrator plan cover."
            >
              <Textarea
                id="reason"
                name="reason"
                rows={4}
                required
                placeholder="Family function at native place."
                invalid={Boolean(fieldError(state, "reason"))}
              />
            </Field>
          </FormGrid>

          <p className="mt-4 rounded-lg bg-surface-inset px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">
            Sundays and declared holidays inside the range are not counted
            against your balance.
          </p>
        </CardBody>
      </Card>

      <FormActions>
        <Button href="/leave" variant="ghost">
          Cancel
        </Button>
        <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
      </FormActions>
    </form>
  );
}
