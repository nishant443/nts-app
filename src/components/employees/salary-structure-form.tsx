"use client";

import { useActionState, useMemo, useState } from "react";

import { saveSalaryStructure } from "@/app/actions/payroll";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Textarea } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { formatCurrency, round2 } from "@/lib/money";

const EARNINGS = [
  { name: "basic", label: "Basic", required: true },
  { name: "hra", label: "House rent allowance" },
  { name: "conveyance", label: "Conveyance" },
  { name: "medical", label: "Medical" },
  { name: "specialAllowance", label: "Special allowance" },
  { name: "otherAllowance", label: "Other allowance" },
] as const;

const DEDUCTIONS = [
  { name: "pfDeduction", label: "Provident fund" },
  { name: "esiDeduction", label: "ESI" },
  { name: "professionalTax", label: "Professional tax" },
  { name: "tdsDeduction", label: "TDS" },
  { name: "otherDeduction", label: "Other deduction" },
] as const;

export type SalaryValues = Record<string, string>;

/**
 * Salary structure, versioned by effective date.
 *
 * Live gross and net totals update as values are typed so the effect of a
 * change is obvious before it is saved.
 */
export function SalaryStructureForm({
  userId,
  values,
}: {
  userId: string;
  values: SalaryValues;
}) {
  const [state, formAction] = useActionState(
    saveSalaryStructure,
    emptyFormState,
  );

  const [amounts, setAmounts] = useState<SalaryValues>(values);

  const set = (name: string, value: string) =>
    setAmounts((current) => ({ ...current, [name]: value }));

  const totals = useMemo(() => {
    const sum = (names: readonly { name: string }[]) =>
      round2(
        names.reduce(
          (total, field) => total + (Number(amounts[field.name]) || 0),
          0,
        ),
      );

    const gross = sum(EARNINGS);
    const deductions = sum(DEDUCTIONS);

    return { gross, deductions, net: round2(gross - deductions) };
  }, [amounts]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="userId" value={userId} />

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Salary structure"
          description="Saved against an effective date — earlier payroll runs keep the figures they were built with."
        />
        <CardBody className="flex flex-col gap-5">
          <Field
            label="Effective from"
            htmlFor="effectiveFrom"
            required
            hint="Payroll uses the most recent structure on or before the month being run."
            error={fieldError(state, "effectiveFrom")}
          >
            <Input
              id="effectiveFrom"
              name="effectiveFrom"
              type="date"
              defaultValue={values.effectiveFrom}
              required
              className="sm:max-w-xs"
              invalid={Boolean(fieldError(state, "effectiveFrom"))}
            />
          </Field>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
                Earnings (monthly)
              </p>
              <FormGrid className="sm:grid-cols-2">
                {EARNINGS.map((field) => (
                  <Field
                    key={field.name}
                    label={field.label}
                    htmlFor={field.name}
                    required={"required" in field && field.required}
                    error={fieldError(state, field.name)}
                  >
                    <Input
                      id={field.name}
                      name={field.name}
                      inputMode="decimal"
                      value={amounts[field.name] ?? "0"}
                      onChange={(event) => set(field.name, event.target.value)}
                      className="tnum"
                      invalid={Boolean(fieldError(state, field.name))}
                    />
                  </Field>
                ))}
              </FormGrid>
            </div>

            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
                Deductions (monthly)
              </p>
              <FormGrid className="sm:grid-cols-2">
                {DEDUCTIONS.map((field) => (
                  <Field
                    key={field.name}
                    label={field.label}
                    htmlFor={field.name}
                    error={fieldError(state, field.name)}
                  >
                    <Input
                      id={field.name}
                      name={field.name}
                      inputMode="decimal"
                      value={amounts[field.name] ?? "0"}
                      onChange={(event) => set(field.name, event.target.value)}
                      className="tnum"
                      invalid={Boolean(fieldError(state, field.name))}
                    />
                  </Field>
                ))}
              </FormGrid>
            </div>
          </div>

          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={values.notes ?? ""}
              placeholder="Annual revision effective April."
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 rounded-lg bg-surface-inset p-4 min-[420px]:grid-cols-3">
            <Total label="Gross" value={totals.gross} />
            <Total label="Deductions" value={totals.deductions} />
            <Total label="Net (full month)" value={totals.net} emphasis />
          </div>

          <p className="text-[12px] leading-relaxed text-fg-subtle">
            These are full-month figures. Actual pay is adjusted for loss of pay
            and approved reimbursements when payroll is run.
          </p>
        </CardBody>

        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
          <SubmitButton>Save structure</SubmitButton>
        </div>
      </Card>
    </form>
  );
}

function Total({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[12px] text-fg-muted">{label}</p>
      <p
        className={
          emphasis
            ? "tnum mt-0.5 text-[17px] font-semibold text-accent"
            : "tnum mt-0.5 text-[17px] font-semibold text-fg"
        }
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
