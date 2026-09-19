"use client";

import { useActionState, useState } from "react";

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
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import {
  expenseAmount,
  FOOD_ALLOWANCE,
  FOOD_TYPE_LABELS,
  TRAVEL_RATE_PER_KM,
} from "@/lib/expense-rates";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { formatCurrency } from "@/lib/money";
import { humanizeEnum } from "@/lib/utils";

const CATEGORIES = [
  "TRAVEL",
  "FUEL",
  "FOOD",
  "TOOLS",
  "MATERIAL",
  "LODGING",
  "COURIER",
  "OTHER",
] as const;

const FOOD_TYPES = ["LOCAL", "OUTSTATION"] as const;

export function ExpenseForm({
  values,
  customers,
}: {
  values: {
    id?: string;
    date: string;
    category: string;
    amount: string;
    distanceKm: string;
    foodType: string;
    description: string;
    customerId: string;
    receiptUrl: string;
  };
  customers: CustomerPickOption[];
}) {
  const [state, formAction] = useActionState(saveExpense, emptyFormState);
  const [receiptUrl, setReceiptUrl] = useState(values.receiptUrl);

  const [category, setCategory] = useState(values.category);
  const [distanceKm, setDistanceKm] = useState(values.distanceKm);
  const [foodType, setFoodType] = useState(values.foodType);

  const isTravel = category === "TRAVEL";
  const isFood = category === "FOOD";
  const derived = expenseAmount({
    category,
    distanceKm: Number(distanceKm),
    foodType,
  });

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
              ? "Saving sends the claim back to your administrator for approval."
              : "Costs you paid for yourself. Approved claims are paid with your salary."
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

            <Field label="Category" htmlFor="category">
              <Select
                id="category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {humanizeEnum(value)}
                  </option>
                ))}
              </Select>
            </Field>

            {isTravel && (
              <Field
                label="Distance travelled"
                htmlFor="distanceKm"
                required
                hint={`Paid at ${formatCurrency(TRAVEL_RATE_PER_KM)} per km.`}
                error={fieldError(state, "distanceKm")}
              >
                <div className="relative">
                  <Input
                    id="distanceKm"
                    name="distanceKm"
                    inputMode="decimal"
                    value={distanceKm}
                    onChange={(event) => setDistanceKm(event.target.value)}
                    placeholder="0"
                    required
                    className="tnum pr-10"
                    invalid={Boolean(fieldError(state, "distanceKm"))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-fg-subtle">
                    km
                  </span>
                </div>
              </Field>
            )}

            {isFood && (
              <Field
                label="Food allowance"
                htmlFor="foodType"
                required
                error={fieldError(state, "foodType")}
              >
                <Select
                  id="foodType"
                  name="foodType"
                  value={foodType}
                  onChange={(event) => setFoodType(event.target.value)}
                  required
                  invalid={Boolean(fieldError(state, "foodType"))}
                >
                  <option value="">Select…</option>
                  {FOOD_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {FOOD_TYPE_LABELS[value]} —{" "}
                      {formatCurrency(FOOD_ALLOWANCE[value])}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {isTravel || isFood ? (
              <Field
                label="Amount"
                htmlFor="amount-derived"
                hint={
                  isTravel
                    ? `${distanceKm || 0} km × ${formatCurrency(TRAVEL_RATE_PER_KM)}`
                    : "Fixed by the allowance you pick."
                }
              >
                <Input
                  id="amount-derived"
                  value={derived === null ? "" : formatCurrency(derived)}
                  placeholder="—"
                  readOnly
                  tabIndex={-1}
                  className="tnum bg-surface-muted font-semibold"
                />
              </Field>
            ) : (
              <Field
                label="Amount"
                htmlFor="amount"
                required
                error={fieldError(state, "amount")}
              >
                <Input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  defaultValue={values.amount}
                  placeholder="0.00"
                  required
                  className="tnum"
                  invalid={Boolean(fieldError(state, "amount"))}
                />
              </Field>
            )}

            <Field
              label="Customer"
              htmlFor="customerId"
              hint="Ties the cost to the customer it was spent for."
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
              required
              className="sm:col-span-2"
              error={fieldError(state, "description")}
            >
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={values.description}
                required
                placeholder={
                  isTravel
                    ? "Office to customer site and back"
                    : isFood
                      ? "Lunch during site visit"
                      : "Cab to customer site and return"
                }
                invalid={Boolean(fieldError(state, "description"))}
              />
            </Field>
          </FormGrid>

          <div className="mt-5 border-t border-border pt-5">
            <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} />
          </div>
        </CardBody>
      </Card>

      <FormActions>
        <Button href="/expenses" variant="ghost">
          Cancel
        </Button>
        {!values.id && (
          <SubmitButton variant="secondary" name="next" value="another">
            Submit & add another
          </SubmitButton>
        )}
        <SubmitButton name="next" value="list">
          {values.id ? "Save claim" : "Submit claim"}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
