"use client";

import { useActionState } from "react";

import { updateOwnProfile } from "@/app/actions/employees";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormGrid, Input, Select } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { INDIAN_STATES } from "@/lib/tax";

export interface OwnProfileValues {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankHolderName: string;
}

export function OwnProfileForm({ values }: { values: OwnProfileValues }) {
  const [state, formAction] = useActionState(updateOwnProfile, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormBanners state={state} />

      <Card>
        <CardHeader title="Personal details" />
        <CardBody>
          <FormGrid>
            <Field
              label="Full name"
              htmlFor="name"
              required
              error={fieldError(state, "name")}
            >
              <Input id="name" name="name" defaultValue={values.name} required />
            </Field>

            <Field label="Phone" htmlFor="phone" error={fieldError(state, "phone")}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={values.phone}
                invalid={Boolean(fieldError(state, "phone"))}
              />
            </Field>

            <Field label="Date of birth" htmlFor="dateOfBirth">
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={values.dateOfBirth}
              />
            </Field>

            <Field label="Gender" htmlFor="gender">
              <Input id="gender" name="gender" defaultValue={values.gender} />
            </Field>

            <Field label="Blood group" htmlFor="bloodGroup">
              <Input
                id="bloodGroup"
                name="bloodGroup"
                defaultValue={values.bloodGroup}
                placeholder="O+"
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address & emergency contact" />
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

            <Field label="Emergency contact" htmlFor="emergencyContactName">
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={values.emergencyContactName}
              />
            </Field>

            <Field
              label="Emergency phone"
              htmlFor="emergencyContactPhone"
              error={fieldError(state, "emergencyContactPhone")}
            >
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                defaultValue={values.emergencyContactPhone}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Bank details"
          description="Where your salary is credited."
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

            <Field label="Account holder name" htmlFor="bankHolderName">
              <Input
                id="bankHolderName"
                name="bankHolderName"
                defaultValue={values.bankHolderName}
              />
            </Field>
          </FormGrid>
        </CardBody>

        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
          <SubmitButton>Save profile</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
