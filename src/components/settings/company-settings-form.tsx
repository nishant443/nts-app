"use client";

import { useActionState } from "react";

import { saveCompanySettings } from "@/app/actions/settings";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { INDIAN_STATES } from "@/lib/tax";

export interface CompanySettingsValues {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin: string;
  pan: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  bankHolderName: string;
  upiId: string;
  invoicesPrefix: string;
  quotationPrefix: string;
  purchaseOrderPrefix: string;
  defaultTaxRate: string;
  homeState: string;
}

export function CompanySettingsForm({
  values,
}: {
  values: CompanySettingsValues;
}) {
  const [state, formAction] = useActionState(
    saveCompanySettings,
    emptyFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Business identity"
          description="Appears on every quotation, invoice and payslip."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Company name"
              htmlFor="name"
              required
              error={fieldError(state, "name")}
            >
              <Input id="name" name="name" defaultValue={values.name} required />
            </Field>

            <Field label="Tagline" htmlFor="tagline">
              <Input id="tagline" name="tagline" defaultValue={values.tagline} />
            </Field>

            <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={values.email}
                invalid={Boolean(fieldError(state, "email"))}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={fieldError(state, "phone")}>
              <Input id="phone" name="phone" type="tel" defaultValue={values.phone} />
            </Field>

            <Field label="Website" htmlFor="website" className="sm:col-span-2">
              <Input id="website" name="website" defaultValue={values.website} />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Registered address & tax" />
        <CardBody>
          <FormGrid>
            <Field label="Address line 1" htmlFor="addressLine1" className="sm:col-span-2">
              <Input
                id="addressLine1"
                name="addressLine1"
                defaultValue={values.addressLine1}
              />
            </Field>

            <Field label="Address line 2" htmlFor="addressLine2" className="sm:col-span-2">
              <Input
                id="addressLine2"
                name="addressLine2"
                defaultValue={values.addressLine2}
              />
            </Field>

            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={values.city} />
            </Field>

            <Field label="State" htmlFor="state">
              <Select id="state" name="state" defaultValue={values.state}>
                <option value="">Select a state</option>
                {INDIAN_STATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="PIN code" htmlFor="postalCode">
              <Input
                id="postalCode"
                name="postalCode"
                inputMode="numeric"
                defaultValue={values.postalCode}
              />
            </Field>

            <Field label="Country" htmlFor="country">
              <Input id="country" name="country" defaultValue={values.country} />
            </Field>

            <Field label="GSTIN" htmlFor="gstin" error={fieldError(state, "gstin")}>
              <Input
                id="gstin"
                name="gstin"
                defaultValue={values.gstin}
                maxLength={15}
                className="font-mono uppercase"
                invalid={Boolean(fieldError(state, "gstin"))}
              />
            </Field>

            <Field label="PAN" htmlFor="pan" error={fieldError(state, "pan")}>
              <Input
                id="pan"
                name="pan"
                defaultValue={values.pan}
                maxLength={10}
                className="font-mono uppercase"
                invalid={Boolean(fieldError(state, "pan"))}
              />
            </Field>

            <Field
              label="Home state"
              htmlFor="homeState"
              required
              className="sm:col-span-2"
              hint="A sale inside this state is charged CGST + SGST; anywhere else is IGST."
              error={fieldError(state, "homeState")}
            >
              <Select
                id="homeState"
                name="homeState"
                defaultValue={values.homeState}
                required
              >
                {INDIAN_STATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Bank details"
          description="Printed on invoices so customers know where to pay."
        />
        <CardBody>
          <FormGrid>
            <Field label="Bank name" htmlFor="bankName">
              <Input id="bankName" name="bankName" defaultValue={values.bankName} />
            </Field>

            <Field label="Account number" htmlFor="bankAccountNo">
              <Input
                id="bankAccountNo"
                name="bankAccountNo"
                defaultValue={values.bankAccountNo}
                className="font-mono"
              />
            </Field>

            <Field label="IFSC" htmlFor="bankIfsc">
              <Input
                id="bankIfsc"
                name="bankIfsc"
                defaultValue={values.bankIfsc}
                className="font-mono uppercase"
              />
            </Field>

            <Field label="Branch" htmlFor="bankBranch">
              <Input
                id="bankBranch"
                name="bankBranch"
                defaultValue={values.bankBranch}
              />
            </Field>

            <Field label="Account holder's name" htmlFor="bankHolderName">
              <Input
                id="bankHolderName"
                name="bankHolderName"
                defaultValue={values.bankHolderName}
              />
            </Field>

            <Field
              label="UPI id"
              htmlFor="upiId"
              hint="When set, invoices print a scan-to-pay QR code next to the bank details."
            >
              <Input id="upiId" name="upiId" defaultValue={values.upiId} placeholder="name@bank" />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Numbering & tax defaults"
          description="Document numbers are prefix + financial year + sequence, e.g. NTS/INV/26-27/28."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Invoice prefix"
              htmlFor="invoicesPrefix"
              required
              error={fieldError(state, "invoicesPrefix")}
            >
              <Input
                id="invoicesPrefix"
                name="invoicesPrefix"
                defaultValue={values.invoicesPrefix}
                required
                className="font-mono"
              />
            </Field>

            <Field
              label="Quotation prefix"
              htmlFor="quotationPrefix"
              required
              error={fieldError(state, "quotationPrefix")}
            >
              <Input
                id="quotationPrefix"
                name="quotationPrefix"
                defaultValue={values.quotationPrefix}
                required
                className="font-mono"
              />
            </Field>

            <Field
              label="Purchase order prefix"
              htmlFor="purchaseOrderPrefix"
              required
              error={fieldError(state, "purchaseOrderPrefix")}
            >
              <Input
                id="purchaseOrderPrefix"
                name="purchaseOrderPrefix"
                defaultValue={values.purchaseOrderPrefix}
                required
                className="font-mono"
              />
            </Field>

            <Field
              label="Default tax rate (%)"
              htmlFor="defaultTaxRate"
              required
              error={fieldError(state, "defaultTaxRate")}
            >
              <Input
                id="defaultTaxRate"
                name="defaultTaxRate"
                inputMode="decimal"
                defaultValue={values.defaultTaxRate}
                required
                className="tnum"
              />
            </Field>
          </FormGrid>
        </CardBody>

        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
          <SubmitButton>Save company details</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
