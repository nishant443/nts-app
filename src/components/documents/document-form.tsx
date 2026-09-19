"use client";

import { useActionState, useState } from "react";

import {
  CustomerPicker,
  type CustomerPickOption,
} from "@/components/customers/customer-picker";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import {
  LineItemsEditor,
  type LineItemValue,
} from "@/components/documents/line-items-editor";
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
import { emptyFormState, fieldError, type FormState } from "@/lib/form-state";
import { INDIAN_STATES } from "@/lib/tax";

export interface CustomerOption {
  id: string;
  label: string;
  state: string | null;
}

export interface DocumentFormValues {
  id?: string;
  customerId: string;
  date: string;
  secondaryDate: string;
  status: string;
  subject: string;
  notes: string;
  terms: string;
  placeOfSupply: string;
  discountAmount: string;
  items: LineItemValue[];
  poNumber?: string;
  poDate?: string;
}

export function DocumentForm({
  action,
  values,
  customers,
  homeState,
  statuses,
  labels,
  showDiscount = true,
  extraHiddenFields,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: DocumentFormValues;
  customers: CustomerOption[];
  homeState: string;
  statuses: { value: string; label: string }[];
  labels: {
    counterparty: string;
    counterpartyField: string;
    secondaryDate: string;
    secondaryDateField: string;
    secondaryDateHint?: string;
    purchaseOrderRef?: boolean;
    submit: string;
    cancelHref: string;
  };
  showDiscount?: boolean;
  extraHiddenFields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, emptyFormState);

  const [customerId, setCustomerId] = useState(values.customerId);
  const [placeOfSupply, setPlaceOfSupply] = useState(
    values.placeOfSupply ||
      customers.find((c) => c.id === values.customerId)?.state ||
      "",
  );

  const onCustomerChange = (id: string, next?: CustomerPickOption) => {
    setCustomerId(id);
    if (next?.state) setPlaceOfSupply(next.state);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {Object.entries(extraHiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <FormBanners state={state} />

      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <FormGrid>
            <Field
              label={labels.counterparty}
              htmlFor={labels.counterpartyField}
              required
              error={fieldError(state, labels.counterpartyField)}
            >
              <CustomerPicker
                id={labels.counterpartyField}
                name={labels.counterpartyField}
                customers={customers}
                value={customerId}
                onChange={onCustomerChange}
                required
                invalid={Boolean(fieldError(state, labels.counterpartyField))}
                newType={
                  labels.counterpartyField === "vendorId" ? "VENDOR" : "LEAD"
                }
              />
            </Field>

            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={values.status}>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </Field>

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
              label={labels.secondaryDate}
              htmlFor={labels.secondaryDateField}
              hint={labels.secondaryDateHint}
            >
              <Input
                id={labels.secondaryDateField}
                name={labels.secondaryDateField}
                type="date"
                defaultValue={values.secondaryDate}
              />
            </Field>

            {labels.purchaseOrderRef && (
              <>
                <Field
                  label="Customer PO no."
                  htmlFor="poNumber"
                  hint="Printed on the invoice so their accounts can match it."
                  error={fieldError(state, "poNumber")}
                >
                  <Input
                    id="poNumber"
                    name="poNumber"
                    defaultValue={values.poNumber ?? ""}
                    placeholder="EST-39"
                  />
                </Field>

                <Field label="PO date" htmlFor="poDate" error={fieldError(state, "poDate")}>
                  <Input
                    id="poDate"
                    name="poDate"
                    type="date"
                    defaultValue={values.poDate ?? ""}
                  />
                </Field>
              </>
            )}

            <Field
              label="Place of supply"
              htmlFor="placeOfSupply"
              hint="Decides whether IGST or CGST + SGST applies."
            >
              <Select
                id="placeOfSupply"
                name="placeOfSupply"
                value={placeOfSupply}
                onChange={(event) => setPlaceOfSupply(event.target.value)}
              >
                <option value="">Same as {homeState}</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Subject" htmlFor="subject">
              <Input
                id="subject"
                name="subject"
                defaultValue={values.subject}
                placeholder="Spindle overhaul — Mazak QT-200"
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Line items"
          description="Services and parts being charged."
        />
        <LineItemsEditor
          initialItems={values.items}
          placeOfSupply={placeOfSupply || homeState}
          homeState={homeState}
          initialDiscount={values.discountAmount}
          showDiscount={showDiscount}
        />
      </Card>

      <Card>
        <CardHeader title="Notes & terms" />
        <CardBody className="flex flex-col gap-4">
          <Field
            label="Notes"
            htmlFor="notes"
            hint="Shown on the document, below the items."
          >
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={values.notes}
            />
          </Field>

          <Field label="Terms & conditions" htmlFor="terms">
            <Textarea
              id="terms"
              name="terms"
              rows={4}
              defaultValue={values.terms}
              placeholder="Payment: 50% advance, balance on completion. Warranty: 6 months on workmanship."
            />
          </Field>
        </CardBody>
      </Card>

      <FormActions>
        <Button href={labels.cancelHref} variant="ghost">
          Cancel
        </Button>
        <SubmitButton>{labels.submit}</SubmitButton>
      </FormActions>
    </form>
  );
}
