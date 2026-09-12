"use client";

import { useActionState } from "react";

import { updateEmployee } from "@/app/actions/employees";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Field,
  FormGrid,
  Input,
  Select,
} from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { INDIAN_STATES } from "@/lib/tax";

export interface EmployeeEditValues {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  designation: string;
  department: string;
  employmentType: string;
  dateOfJoining: string;
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
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankHolderName: string;
}

export function EmployeeEditForm({ values }: { values: EmployeeEditValues }) {
  const [state, formAction] = useActionState(updateEmployee, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={values.id} />

      <FormBanners state={state} />

      <Card>
        <CardHeader title="Identity & access" />
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

            <Field
              label="Email"
              htmlFor="email"
              required
              error={fieldError(state, "email")}
            >
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={values.email}
                required
                invalid={Boolean(fieldError(state, "email"))}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={fieldError(state, "phone")}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={values.phone}
              />
            </Field>

            <Field
              label="Access level"
              htmlFor="role"
              error={fieldError(state, "role")}
              hint="Administrators see company-wide sales and payment figures."
            >
              <Select id="role" name="role" defaultValue={values.role}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </Field>

            <Field
              label="Account status"
              htmlFor="status"
              error={fieldError(state, "status")}
              hint="Deactivating signs the employee out of every device."
            >
              <Select id="status" name="status" defaultValue={values.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Employment" />
        <CardBody>
          <FormGrid>
            <Field label="Designation" htmlFor="designation">
              <Input
                id="designation"
                name="designation"
                defaultValue={values.designation}
              />
            </Field>

            <Field label="Department" htmlFor="department">
              <Input
                id="department"
                name="department"
                defaultValue={values.department}
              />
            </Field>

            <Field label="Employment type" htmlFor="employmentType">
              <Select
                id="employmentType"
                name="employmentType"
                defaultValue={values.employmentType}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </Select>
            </Field>

            <Field label="Date of joining" htmlFor="dateOfJoining">
              <Input
                id="dateOfJoining"
                name="dateOfJoining"
                type="date"
                defaultValue={values.dateOfJoining}
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
        <CardHeader title="Contact & address" />
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
          title="Statutory & bank"
          description="Used on payslips and for salary transfers."
        />
        <CardBody>
          <FormGrid>
            <Field label="PAN" htmlFor="panNumber" error={fieldError(state, "panNumber")}>
              <Input
                id="panNumber"
                name="panNumber"
                defaultValue={values.panNumber}
                maxLength={10}
                className="font-mono uppercase"
                invalid={Boolean(fieldError(state, "panNumber"))}
              />
            </Field>

            <Field label="Aadhaar" htmlFor="aadhaarNumber">
              <Input
                id="aadhaarNumber"
                name="aadhaarNumber"
                defaultValue={values.aadhaarNumber}
                inputMode="numeric"
                className="font-mono"
              />
            </Field>

            <Field label="UAN" htmlFor="uanNumber">
              <Input
                id="uanNumber"
                name="uanNumber"
                defaultValue={values.uanNumber}
                className="font-mono"
              />
            </Field>

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

            <Field label="Account holder" htmlFor="bankHolderName" className="sm:col-span-2">
              <Input
                id="bankHolderName"
                name="bankHolderName"
                defaultValue={values.bankHolderName}
              />
            </Field>
          </FormGrid>
        </CardBody>

        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
          <SubmitButton>Save employee</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
