"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { fetchGstinDetails } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { fieldError, type FormState } from "@/lib/form-state";
import type { GstinDetails } from "@/lib/gstin-lookup";
import { INDIAN_STATES, isValidGstin, stateFromGstin } from "@/lib/tax";

/**
 * Every customer field, in the three groups the customer page shows them in.
 *
 * Shared by the full-page form and the "Add new customer…" dialog inside other
 * forms, so the two can never ask for different information. `section` lets
 * each host wrap a group its own way — a Card on the page, a fieldset in the
 * dialog. Input names are the schema's field names; ids are prefixed with
 * `useId()` so two copies on one page (dialog over form) cannot collide.
 *
 * Typing a complete GSTIN looks the business up (`lib/gstin-lookup.ts`) and
 * fills the company, PAN and address — the same convenience Vyapar offers.
 * Those fields are therefore controlled here; everything else stays
 * uncontrolled with a `defaultValue`.
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

  // Fields the GST lookup can fill.
  const [filled, setFilled] = useState({
    companyName: values.companyName,
    pan: values.pan,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    city: values.city,
    postalCode: values.postalCode,
  });
  const setField = (name: keyof typeof filled, value: string) =>
    setFilled((current) => ({ ...current, [name]: value }));

  const [lookup, setLookup] = useState<
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "done"; details: GstinDetails }
    | { phase: "error"; message: string }
  >({ phase: "idle" });
  // The GSTIN the last automatic lookup ran for, so retyping the same number
  // does not hit the (metered) provider again.
  const autoLookedUp = useRef<string | null>(null);

  const runLookup = async (value: string) => {
    setLookup({ phase: "loading" });
    const result = await fetchGstinDetails({ gstin: value });
    if (!result.ok) {
      setLookup({ phase: "error", message: result.error });
      return;
    }
    const details = result.data;
    setFilled({
      companyName: details.tradeName ?? details.legalName,
      pan: details.pan ?? "",
      addressLine1: details.addressLine1 ?? "",
      addressLine2: details.addressLine2 ?? "",
      city: details.city ?? "",
      postalCode: details.postalCode ?? "",
    });
    if (details.state) setStateName(details.state);
    setLookup({ phase: "done", details });
    toast.success(
      "Details filled from the GST registration — check them before saving.",
    );
  };

  const onGstinChange = (value: string) => {
    const upper = value.toUpperCase().replace(/\s+/g, "");
    setGstin(upper);
    const derived = upper.length >= 2 ? stateFromGstin(upper) : null;
    if (derived) setStateName(derived);
    if (upper.length < 15) setLookup({ phase: "idle" });
  };

  // Look up automatically once a full, valid GSTIN is in the box — typed or
  // pasted — so the usual flow is: paste the number, watch the form fill.
  useEffect(() => {
    if (!isValidGstin(gstin) || autoLookedUp.current === gstin) return;
    autoLookedUp.current = gstin;
    void runLookup(gstin);
  }, [gstin]);

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
                value={filled.companyName}
                onChange={(event) =>
                  setField("companyName", event.target.value)
                }
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
              className="sm:col-span-2"
              hint={
                lookup.phase === "idle"
                  ? "15 characters. Company, PAN and address are fetched from the GST registration; the state is filled from the first two digits."
                  : undefined
              }
              error={fieldError(state, "gstin")}
            >
              <div className="flex gap-2">
                <Input
                  id={id("gstin")}
                  name="gstin"
                  value={gstin}
                  onChange={(event) => onGstinChange(event.target.value)}
                  maxLength={15}
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="29ABCDE1234F1Z5"
                  className="min-w-0 flex-1 font-mono"
                  invalid={Boolean(fieldError(state, "gstin"))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void runLookup(gstin)}
                  disabled={!isValidGstin(gstin) || lookup.phase === "loading"}
                  title={
                    isValidGstin(gstin)
                      ? "Fetch the registered details for this GSTIN"
                      : "Enter a valid 15-character GSTIN first"
                  }
                >
                  {lookup.phase === "loading" ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Search aria-hidden="true" />
                  )}
                  Fetch details
                </Button>
              </div>

              {lookup.phase === "loading" && (
                <p className="mt-1.5 text-[12.5px] text-fg-muted">
                  Looking up the GST registration…
                </p>
              )}
              {lookup.phase === "done" && (
                <p
                  className={
                    lookup.details.status &&
                    !/active/i.test(lookup.details.status)
                      ? "mt-1.5 flex items-start gap-1.5 text-[12.5px] text-warning"
                      : "mt-1.5 flex items-start gap-1.5 text-[12.5px] text-success"
                  }
                  role="status"
                >
                  {lookup.details.status &&
                  !/active/i.test(lookup.details.status) ? (
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                  ) : (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                  )}
                  <span>
                    <span className="font-medium">
                      {lookup.details.legalName}
                    </span>
                    {lookup.details.status && <> · {lookup.details.status}</>}
                    {lookup.details.constitution && (
                      <> · {lookup.details.constitution}</>
                    )}
                    {lookup.details.registeredOn && (
                      <> · registered {lookup.details.registeredOn}</>
                    )}
                  </span>
                </p>
              )}
              {lookup.phase === "error" && (
                <p
                  className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-danger"
                  role="alert"
                >
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <span>{lookup.message}</span>
                </p>
              )}
            </Field>

            <Field
              label="PAN"
              htmlFor={id("pan")}
              error={fieldError(state, "pan")}
            >
              <Input
                id={id("pan")}
                name="pan"
                value={filled.pan}
                onChange={(event) =>
                  setField("pan", event.target.value.toUpperCase())
                }
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
                value={filled.addressLine1}
                onChange={(event) =>
                  setField("addressLine1", event.target.value)
                }
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
                value={filled.addressLine2}
                onChange={(event) =>
                  setField("addressLine2", event.target.value)
                }
              />
            </Field>

            <Field label="City" htmlFor={id("city")}>
              <Input
                id={id("city")}
                name="city"
                value={filled.city}
                onChange={(event) => setField("city", event.target.value)}
              />
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
                value={filled.postalCode}
                onChange={(event) => setField("postalCode", event.target.value)}
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
