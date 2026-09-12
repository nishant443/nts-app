"use client";

import { useActionState, useMemo, useState } from "react";

import { savePayment } from "@/app/actions/payments";
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
import { formatCurrency } from "@/lib/money";

export interface OpenInvoice {
  id: string;
  number: string;
  customerId: string;
  balance: number;
  dueDate: string | null;
}

const MODES = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE", "CASH", "CARD", "OTHER"];

/**
 * Records a receipt.
 *
 * Choosing an invoice narrows the customer and pre-fills the outstanding
 * balance, which is what people almost always want to enter. The server
 * re-checks that the amount does not exceed the balance.
 */
export function PaymentForm({
  customers,
  invoices,
  initial,
}: {
  customers: { id: string; label: string }[];
  invoices: OpenInvoice[];
  initial: {
    customerId: string;
    invoiceId: string;
    date: string;
    amount: string;
    mode: string;
    status: string;
    reference: string;
    notes: string;
  };
}) {
  const [state, formAction] = useActionState(savePayment, emptyFormState);

  const [customerId, setCustomerId] = useState(initial.customerId);
  const [invoiceId, setInvoiceId] = useState(initial.invoiceId);
  const [amount, setAmount] = useState(initial.amount);

  const visibleInvoices = useMemo(
    () =>
      customerId
        ? invoices.filter((invoice) => invoice.customerId === customerId)
        : invoices,
    [customerId, invoices],
  );

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);

  const onInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const invoice = invoices.find((entry) => entry.id === id);
    if (invoice) {
      setCustomerId(invoice.customerId);
      setAmount(invoice.balance.toFixed(2));
    }
  };

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    // Clear an invoice that belongs to a different customer.
    if (selectedInvoice && selectedInvoice.customerId !== id) {
      setInvoiceId("");
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormBanners state={state} />

      <Card>
        <CardHeader title="Receipt details" />
        <CardBody>
          <FormGrid>
            <Field
              label="Against invoice"
              htmlFor="invoiceId"
              hint="Leave blank for an advance or on-account receipt."
              error={fieldError(state, "invoiceId")}
            >
              <Select
                id="invoiceId"
                name="invoiceId"
                value={invoiceId}
                onChange={(event) => onInvoiceChange(event.target.value)}
              >
                <option value="">No specific invoice</option>
                {visibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} — {formatCurrency(invoice.balance)} due
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Customer"
              htmlFor="customerId"
              required
              error={fieldError(state, "customerId")}
            >
              <Select
                id="customerId"
                name="customerId"
                value={customerId}
                onChange={(event) => onCustomerChange(event.target.value)}
                required
                invalid={Boolean(fieldError(state, "customerId"))}
              >
                <option value="">Select…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Amount"
              htmlFor="amount"
              required
              error={fieldError(state, "amount")}
              hint={
                selectedInvoice
                  ? `Balance on ${selectedInvoice.number}: ${formatCurrency(selectedInvoice.balance)}`
                  : undefined
              }
            >
              <Input
                id="amount"
                name="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                required
                className="tnum"
                invalid={Boolean(fieldError(state, "amount"))}
              />
            </Field>

            <Field
              label="Date received"
              htmlFor="date"
              required
              error={fieldError(state, "date")}
            >
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={initial.date}
                required
              />
            </Field>

            <Field label="Mode" htmlFor="mode">
              <Select id="mode" name="mode" defaultValue={initial.mode}>
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              hint="Use Pending for a cheque still in clearing."
            >
              <Select id="status" name="status" defaultValue={initial.status}>
                <option value="RECEIVED">Received</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </Field>

            <Field
              label="Reference"
              htmlFor="reference"
              hint="UTR, cheque number or transaction id."
              className="sm:col-span-2"
            >
              <Input
                id="reference"
                name="reference"
                defaultValue={initial.reference}
                className="font-mono text-[13px]"
              />
            </Field>

            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={initial.notes}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <FormActions>
        <Button href="/payments" variant="ghost">
          Cancel
        </Button>
        <SubmitButton>Record payment</SubmitButton>
      </FormActions>
    </form>
  );
}
