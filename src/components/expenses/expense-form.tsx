"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { saveExpense } from "@/app/actions/work";
import {
  CustomerPicker,
  type CustomerPickOption,
} from "@/components/customers/customer-picker";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { ReceiptUpload } from "@/components/expenses/receipt-upload";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Field,
  FormActions,
  FormError,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LINE_PREFIX,
  expenseLineAmount,
  FOOD_ALLOWANCE,
  FOOD_TYPE_LABELS,
  FUEL_RATE_PER_KM,
} from "@/lib/expense-rates";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { formatCurrency } from "@/lib/money";
import { humanizeEnum } from "@/lib/utils";

export interface ExpenseLineValue {
  category: string;
  amount: string;
  distanceKm: string;
  foodType: string;
  note: string;
}

export const EMPTY_EXPENSE_LINE: ExpenseLineValue = {
  category: "FUEL",
  amount: "",
  distanceKm: "",
  foodType: "",
  note: "",
};

const FOOD_TYPES = ["LOCAL", "OUTSTATION"] as const;

function lineAmount(line: ExpenseLineValue): number | null {
  return expenseLineAmount({
    category: line.category,
    amount: line.amount === "" ? null : Number(line.amount),
    distanceKm: Number(line.distanceKm),
    foodType: line.foodType,
  });
}

export function ExpenseForm({
  values,
  customers,
}: {
  values: {
    id?: string;
    date: string;
    description: string;
    customerId: string;
    receiptUrl: string;
    items: ExpenseLineValue[];
  };
  customers: CustomerPickOption[];
}) {
  const [state, formAction] = useActionState(saveExpense, emptyFormState);
  const [receiptUrl, setReceiptUrl] = useState(values.receiptUrl);
  const [lines, setLines] = useState<ExpenseLineValue[]>(
    values.items.length > 0 ? values.items : [{ ...EMPTY_EXPENSE_LINE }],
  );

  const update = (index: number, patch: Partial<ExpenseLineValue>) => {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () =>
    setLines((current) => [...current, { ...EMPTY_EXPENSE_LINE }]);

  const removeLine = (index: number) =>
    setLines((current) =>
      current.length === 1
        ? [{ ...EMPTY_EXPENSE_LINE }]
        : current.filter((_, i) => i !== index),
    );

  const total = lines.reduce((sum, line) => sum + (lineAmount(line) ?? 0), 0);
  const linesError = state.fieldErrors?.items?.join(" ");

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="receiptUrl" value={receiptUrl} />

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Expense claim"
          description={
            values.id
              ? "Saving sends the whole claim back to your administrator for approval."
              : "Add every cost for the day in one claim. Approved claims are paid with your salary."
          }
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
              label="Customer"
              htmlFor="customerId"
              hint="Ties the costs to the customer they were spent for."
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
              label="Description"
              htmlFor="description"
              className="sm:col-span-2"
              error={fieldError(state, "description")}
            >
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={values.description}
                placeholder="Site visit — optional"
                invalid={Boolean(fieldError(state, "description"))}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Expenses"
          description={`Fuel is paid at ${formatCurrency(FUEL_RATE_PER_KM)} per km; food is a fixed local / outstation allowance. Everything else is claimed at cost.`}
        />

        <div className="flex flex-col divide-y divide-border">
          <div className="hidden items-center gap-3 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle sm:px-5 lg:flex">
            <span className="w-36 shrink-0">Category</span>
            <span className="w-44 shrink-0">Details</span>
            <span className="flex-1">Note</span>
            <span className="w-28 shrink-0 text-right">Amount</span>
            <span className="w-8 shrink-0" />
          </div>

          {lines.map((line, index) => {
            const name = (field: keyof ExpenseLineValue) =>
              `${EXPENSE_LINE_PREFIX}.${index}.${field}`;
            const isFuel = line.category === "FUEL";
            const isFood = line.category === "FOOD";
            const amount = lineAmount(line);

            return (
              <div
                key={index}
                className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:gap-3 lg:py-3"
              >
                <div className="lg:w-36 lg:shrink-0">
                  <MobileLabel>Category</MobileLabel>
                  <Select
                    name={name("category")}
                    value={line.category}
                    onChange={(event) =>
                      update(index, {
                        category: event.target.value,
                        amount: "",
                        distanceKm: "",
                        foodType: "",
                      })
                    }
                    aria-label={`Line ${index + 1} category`}
                  >
                    {EXPENSE_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {humanizeEnum(value)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="lg:w-44 lg:shrink-0">
                  {isFuel ? (
                    <>
                      <MobileLabel>Distance</MobileLabel>
                      <div className="relative">
                        <Input
                          name={name("distanceKm")}
                          value={line.distanceKm}
                          onChange={(event) =>
                            update(index, { distanceKm: event.target.value })
                          }
                          inputMode="decimal"
                          placeholder="0"
                          className="tnum pr-10"
                          aria-label={`Line ${index + 1} distance in km`}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-fg-subtle">
                          km
                        </span>
                      </div>
                    </>
                  ) : isFood ? (
                    <>
                      <MobileLabel>Allowance</MobileLabel>
                      <Select
                        name={name("foodType")}
                        value={line.foodType}
                        onChange={(event) =>
                          update(index, { foodType: event.target.value })
                        }
                        aria-label={`Line ${index + 1} food allowance`}
                      >
                        <option value="">Select…</option>
                        {FOOD_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {FOOD_TYPE_LABELS[value]} —{" "}
                            {formatCurrency(FOOD_ALLOWANCE[value])}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <>
                      <MobileLabel>Amount spent</MobileLabel>
                      <Input
                        name={name("amount")}
                        value={line.amount}
                        onChange={(event) =>
                          update(index, { amount: event.target.value })
                        }
                        inputMode="decimal"
                        placeholder="0.00"
                        className="tnum"
                        aria-label={`Line ${index + 1} amount`}
                      />
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <MobileLabel>Note</MobileLabel>
                  <Input
                    name={name("note")}
                    value={line.note}
                    onChange={(event) =>
                      update(index, { note: event.target.value })
                    }
                    placeholder={
                      isFuel
                        ? "Office to site and back"
                        : isFood
                          ? "Lunch"
                          : "Optional"
                    }
                    aria-label={`Line ${index + 1} note`}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 lg:w-28 lg:shrink-0 lg:justify-end">
                  <MobileLabel>Amount</MobileLabel>
                  <span className="tnum h-10 leading-10 text-[14px] font-semibold text-fg">
                    {amount === null ? "—" : formatCurrency(amount)}
                  </span>
                </div>

                <div className="flex justify-end lg:w-8 lg:shrink-0">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label={`Remove line ${index + 1}`}
                    className="inline-flex size-10 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Button variant="secondary" size="sm" onClick={addLine}>
            <Plus aria-hidden="true" />
            Add another expense
          </Button>
          <p className="text-[14px] text-fg-muted">
            Total{" "}
            <span className="tnum ml-1 text-[16px] font-semibold text-fg">
              {formatCurrency(total)}
            </span>
          </p>
        </div>

        {linesError && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <FormError>{linesError}</FormError>
          </div>
        )}

        <div className="border-t border-border px-4 py-4 sm:px-5">
          <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} />
        </div>
      </Card>

      <FormActions>
        <Button href="/expenses" variant="ghost">
          Cancel
        </Button>
        <SubmitButton>{values.id ? "Save claim" : "Submit claim"}</SubmitButton>
      </FormActions>
    </form>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[12px] font-medium text-fg-muted lg:hidden">
      {children}
    </span>
  );
}
