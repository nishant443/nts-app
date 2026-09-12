"use client";

import { useActionState, useState } from "react";

import { saveCustomer } from "@/app/actions/customers";
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
import { INDIAN_STATES, stateFromGstin } from "@/lib/tax";

export interface CustomerFormValues {
  id?: string;
  name: string;
  companyName: string;
  type: string;
  email: string;
  phone: string;
  altPhone: string;
  website: string;
  gstin: string;
  pan: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  ownerId: string;
}

const CUSTOMER_TYPES = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active customer" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "VENDOR", label: "Vendor / supplier" },
];

export function CustomerForm({
  values,
  owners,
  canAssignOwner,
}: {
  values: CustomerFormValues;
  owners: { id: string; name: string }[];
  canAssignOwner: boolean;
}) {
  const [state, formAction] = useActionState(saveCustomer, emptyFormState);

  // GSTIN encodes the state in its first two digits. Filling the state from it
  // saves a step and keeps place-of-supply correct for GST.
  const [gstin, setGstin] = useState(values.gstin);
  const [stateName, setStateName] = useState(values.state);

  const onGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setGstin(upper);
    const derived = upper.length >= 2 ? stateFromGstin(upper) : null;
    if (derived) setStateName(derived);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="Contact"
          description="Who you deal with and how to reach them."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Contact name"
              htmlFor="name"
              required
              error={fieldError(state, "name")}
            >
              <Input
                id="name"
                name="name"
                defaultValue={values.name}
                required
                autoComplete="off"
                invalid={Boolean(fieldError(state, "name"))}
              />
            </Field>

            <Field
              label="Company"
              htmlFor="companyName"
              error={fieldError(state, "companyName")}
            >
              <Input
                id="companyName"
                name="companyName"
                defaultValue={values.companyName}
                autoComplete="off"
              />
            </Field>

            <Field label="Relationship" htmlFor="type">
              <Select id="type" name="type" defaultValue={values.type}>
                {CUSTOMER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            {canAssignOwner && (
              <Field
                label="Account owner"
                htmlFor="ownerId"
                hint="The engineer who looks after this account."
              >
                <Select id="ownerId" name="ownerId" defaultValue={values.ownerId}>
                  <option value="">Unassigned</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label="Email"
              htmlFor="email"
              error={fieldError(state, "email")}
            >
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                defaultValue={values.email}
                invalid={Boolean(fieldError(state, "email"))}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="phone"
              error={fieldError(state, "phone")}
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={values.phone}
                invalid={Boolean(fieldError(state, "phone"))}
              />
            </Field>

            <Field
              label="Alternate phone"
              htmlFor="altPhone"
              error={fieldError(state, "altPhone")}
            >
              <Input
                id="altPhone"
                name="altPhone"
                type="tel"
                inputMode="tel"
                defaultValue={values.altPhone}
              />
            </Field>

            <Field label="Website" htmlFor="website">
              <Input
                id="website"
                name="website"
                defaultValue={values.website}
                placeholder="https://"
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tax & address"
          description="Used on quotations and invoices — the state decides IGST vs CGST/SGST."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="GSTIN"
              htmlFor="gstin"
              hint="15 characters. The state is filled in from this."
              error={fieldError(state, "gstin")}
            >
              <Input
                id="gstin"
                name="gstin"
                value={gstin}
                onChange={(event) => onGstinChange(event.target.value)}
                maxLength={15}
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono"
                invalid={Boolean(fieldError(state, "gstin"))}
              />
            </Field>

            <Field label="PAN" htmlFor="pan" error={fieldError(state, "pan")}>
              <Input
                id="pan"
                name="pan"
                defaultValue={values.pan}
                maxLength={10}
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono uppercase"
                invalid={Boolean(fieldError(state, "pan"))}
              />
            </Field>

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
              <Select
                id="state"
                name="state"
                value={stateName}
                onChange={(event) => setStateName(event.target.value)}
              >
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
                maxLength={10}
                defaultValue={values.postalCode}
              />
            </Field>

            <Field label="Country" htmlFor="country">
              <Input
                id="country"
                name="country"
                defaultValue={values.country || "India"}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notes" description="Anything worth remembering." />
        <CardBody>
          <Field label="Internal notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={values.notes}
              placeholder="Machines on site, preferred contact times, payment behaviour…"
            />
          </Field>
        </CardBody>
      </Card>

      <FormActions>
        <Button
          href={values.id ? `/customers/${values.id}` : "/customers"}
          variant="ghost"
        >
          Cancel
        </Button>
        <SubmitButton>
          {values.id ? "Save changes" : "Add customer"}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
