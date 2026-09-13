"use client";

import { useId, useState, type ReactNode } from "react";

import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { fieldError, type FormState } from "@/lib/form-state";
import { INDIAN_STATES, stateFromGstin } from "@/lib/tax";

/**
 * Every customer field, in the three groups the customer page shows them in.
 *
 * Shared by the full-page form and the "Add new customer…" dialog inside other
 * forms, so the two can never ask for different information. `section` lets
 * each host wrap a group its own way — a Card on the page, a fieldset in the
 * dialog. Input names are the schema's field names; ids are prefixed with
 * `useId()` so two copies on one page (dialog over form) cannot collide.
 */

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

export const CUSTOMER_TYPES = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active customer" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "VENDOR", label: "Vendor / supplier" },
];

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: "",
  companyName: "",
  type: "LEAD",
  email: "",
  phone: "",
  altPhone: "",
  website: "",
  gstin: "",
  pan: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  notes: "",
  ownerId: "",
};

export function CustomerFields({
  values,
  state,
  owners = [],
  canAssignOwner = false,
  section,
}: {
  values: CustomerFormValues;
  state: FormState;
  owners?: { id: string; name: string }[];
  canAssignOwner?: boolean;
  section: (props: {
    title: string;
    description: string;
    children: ReactNode;
  }) => ReactNode;
}) {
  const prefix = useId();
  const id = (name: string) => `${prefix}-${name}`;

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
    <>
      {section({
        title: "Contact",
        description: "Who you deal with and how to reach them.",
        children: (
          <FormGrid>
            <Field
              label="Contact name"
              htmlFor={id("name")}
              required
              error={fieldError(state, "name")}
            >
              <Input
                id={id("name")}
                name="name"
                defaultValue={values.name}
                required
                autoComplete="off"
                invalid={Boolean(fieldError(state, "name"))}
              />
            </Field>

            <Field
              label="Company"
              htmlFor={id("companyName")}
              error={fieldError(state, "companyName")}
            >
              <Input
                id={id("companyName")}
                name="companyName"
                defaultValue={values.companyName}
                autoComplete="off"
              />
            </Field>

            <Field label="Relationship" htmlFor={id("type")}>
              <Select id={id("type")} name="type" defaultValue={values.type}>
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
                htmlFor={id("ownerId")}
                hint="The engineer who looks after this account."
              >
                <Select
                  id={id("ownerId")}
                  name="ownerId"
                  defaultValue={values.ownerId}
                >
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
              htmlFor={id("email")}
              error={fieldError(state, "email")}
            >
              <Input
                id={id("email")}
                name="email"
                type="email"
                inputMode="email"
                defaultValue={values.email}
                invalid={Boolean(fieldError(state, "email"))}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor={id("phone")}
              error={fieldError(state, "phone")}
            >
              <Input
                id={id("phone")}
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={values.phone}
                invalid={Boolean(fieldError(state, "phone"))}
              />
            </Field>

            <Field
              label="Alternate phone"
              htmlFor={id("altPhone")}
              error={fieldError(state, "altPhone")}
            >
              <Input
                id={id("altPhone")}
                name="altPhone"
                type="tel"
                inputMode="tel"
                defaultValue={values.altPhone}
              />
            </Field>

            <Field label="Website" htmlFor={id("website")}>
              <Input
                id={id("website")}
                name="website"
                defaultValue={values.website}
                placeholder="https://"
              />
            </Field>
          </FormGrid>
        ),
      })}

      {section({
        title: "Tax & address",
        description:
          "Used on quotations and invoices — the state decides IGST vs CGST/SGST.",
        children: (
          <FormGrid>
            <Field
              label="GSTIN"
              htmlFor={id("gstin")}
              hint="15 characters. The state is filled in from this."
              error={fieldError(state, "gstin")}
            >
              <Input
                id={id("gstin")}
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

            <Field
              label="PAN"
              htmlFor={id("pan")}
              error={fieldError(state, "pan")}
            >
              <Input
                id={id("pan")}
                name="pan"
                defaultValue={values.pan}
                maxLength={10}
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono uppercase"
                invalid={Boolean(fieldError(state, "pan"))}
              />
            </Field>

            <Field
              label="Address line 1"
              htmlFor={id("addressLine1")}
              className="sm:col-span-2"
            >
              <Input
                id={id("addressLine1")}
                name="addressLine1"
                defaultValue={values.addressLine1}
              />
            </Field>

            <Field
              label="Address line 2"
              htmlFor={id("addressLine2")}
              className="sm:col-span-2"
            >
              <Input
                id={id("addressLine2")}
                name="addressLine2"
                defaultValue={values.addressLine2}
              />
            </Field>

            <Field label="City" htmlFor={id("city")}>
              <Input id={id("city")} name="city" defaultValue={values.city} />
            </Field>

            <Field label="State" htmlFor={id("state")}>
              <Select
                id={id("state")}
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

            <Field label="PIN code" htmlFor={id("postalCode")}>
              <Input
                id={id("postalCode")}
                name="postalCode"
                inputMode="numeric"
                maxLength={10}
                defaultValue={values.postalCode}
              />
            </Field>

            <Field label="Country" htmlFor={id("country")}>
              <Input
                id={id("country")}
                name="country"
                defaultValue={values.country || "India"}
              />
            </Field>
          </FormGrid>
        ),
      })}

      {section({
        title: "Notes",
        description: "Anything worth remembering.",
        children: (
          <Field label="Internal notes" htmlFor={id("notes")}>
            <Textarea
              id={id("notes")}
              name="notes"
              rows={4}
              defaultValue={values.notes}
              placeholder="Machines on site, preferred contact times, payment behaviour…"
            />
          </Field>
        ),
      })}
    </>
  );
}
