"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";

import { createPayrollRun } from "@/app/actions/payroll";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PayrollRunForm({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: number;
  defaultYear: number;
}) {
  const [state, formAction] = useActionState(createPayrollRun, emptyFormState);

  const years = Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Start a payroll run"
          description="One run per month. Payslips are generated from attendance, salary structures and approved expenses."
        />
        <CardBody className="flex flex-col gap-4">
          <FormBanners state={state} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="Month" htmlFor="month" className="sm:w-48">
              <Select id="month" name="month" defaultValue={String(defaultMonth)}>
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Year" htmlFor="year" className="sm:w-32">
              <Select id="year" name="year" defaultValue={String(defaultYear)}>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Notes"
              htmlFor="notes"
              className="min-w-0 flex-1"
              error={fieldError(state, "notes")}
            >
              <Input
                id="notes"
                name="notes"
                placeholder="Regular monthly payroll."
              />
            </Field>

            <SubmitButton pendingLabel="Creating…">
              <Play aria-hidden="true" />
              Create run
            </SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
