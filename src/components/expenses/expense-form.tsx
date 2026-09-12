"use client";

import { useActionState, useState } from "react";

import { saveExpense } from "@/app/actions/work";
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
import { emptyFormState, fieldError } from "@/lib/form-state";
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

export function ExpenseForm({
  values,
  workLogs,
}: {
  values: {
    id?: string;
    date: string;
    category: string;
    amount: string;
    description: string;
    workLogId: string;
    receiptUrl: string;
  };
  workLogs: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(saveExpense, emptyFormState);
  const [receiptUrl, setReceiptUrl] = useState(values.receiptUrl);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {/* Uploaded out of band, then carried through with the form. */}
      <input type="hidden" name="receiptUrl" value={receiptUrl} />

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Expense claim"
          description="Costs you paid for yourself and want reimbursed."
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
                defaultValue={values.category}
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {humanizeEnum(value)}
                  </option>
                ))}
              </Select>
            </Field>

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

            <Field
              label="Linked work report"
              htmlFor="workLogId"
              hint="Ties the cost to the visit it belongs to."
            >
              <Select
                id="workLogId"
                name="workLogId"
                defaultValue={values.workLogId}
              >
                <option value="">Not linked</option>
                {workLogs.map((log) => (
                  <option key={log.id} value={log.id}>
                    {log.label}
                  </option>
                ))}
              </Select>
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
                placeholder="Cab to customer site and return"
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
        <SubmitButton>{values.id ? "Save claim" : "Submit claim"}</SubmitButton>
      </FormActions>
    </form>
  );
}
