"use client";

import { useActionState } from "react";

import { createEmployee } from "@/app/actions/employees";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Field,
  FormActions,
  FormGrid,
  Input,
  Select,
} from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";

export function EmployeeCreateForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction] = useActionState(createEmployee, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormBanners state={state} />

      <Card>
        <CardHeader
          title="New employee"
          description="An employee code is assigned automatically."
        />
        <CardBody>
          <FormGrid>
            <Field
              label="Full name"
              htmlFor="name"
              required
              error={fieldError(state, "name")}
            >
              <Input
                id="name"
                name="name"
                required
                autoComplete="off"
                invalid={Boolean(fieldError(state, "name"))}
              />
            </Field>

            <Field
              label="Email"
              htmlFor="email"
              required
              hint="Used to sign in."
              error={fieldError(state, "email")}
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                invalid={Boolean(fieldError(state, "email"))}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="phone"
              error={fieldError(state, "phone")}
            >
              <Input id="phone" name="phone" type="tel" inputMode="tel" />
            </Field>

            <Field
              label="Access level"
              htmlFor="role"
              hint="Administrators can see company-wide figures."
            >
              <Select id="role" name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </Field>

            <Field label="Designation" htmlFor="designation">
              <Input
                id="designation"
                name="designation"
                placeholder="Service Engineer"
              />
            </Field>

            <Field label="Department" htmlFor="department">
              <Input id="department" name="department" placeholder="Service" />
            </Field>

            <Field label="Employment type" htmlFor="employmentType">
              <Select
                id="employmentType"
                name="employmentType"
                defaultValue="FULL_TIME"
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
                defaultValue={defaultDate}
              />
            </Field>

            <Field
              label="Initial password"
              htmlFor="password"
              required
              className="sm:col-span-2"
              hint="At least 10 characters with upper case, lower case and a number. Share it securely and ask them to change it after signing in."
              error={fieldError(state, "password")}
            >
              <Input
                id="password"
                name="password"
                type="text"
                required
                autoComplete="new-password"
                className="font-mono"
                invalid={Boolean(fieldError(state, "password"))}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <FormActions>
        <Button href="/admin/employees" variant="ghost">
          Cancel
        </Button>
        <SubmitButton>Create employee</SubmitButton>
      </FormActions>
    </form>
  );
}
