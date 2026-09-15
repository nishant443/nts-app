"use client";

import { useActionState } from "react";

import { changePassword } from "@/app/actions/auth";
import { FormBanners, SubmitButton } from "@/components/forms/form-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { emptyFormState, fieldError } from "@/lib/form-state";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, emptyFormState);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Change password"
          description="Changing your password signs you out of every other device."
        />
        <CardBody className="flex max-w-md flex-col gap-4">
          <FormBanners state={state} />

          <Field
            label="Current password"
            htmlFor="currentPassword"
            required
            error={fieldError(state, "currentPassword")}
          >
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
              invalid={Boolean(fieldError(state, "currentPassword"))}
            />
          </Field>

          <Field
            label="New password"
            htmlFor="newPassword"
            required
            hint="At least 10 characters, with an upper case letter, a lower case letter and a number."
            error={fieldError(state, "newPassword")}
          >
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              required
              invalid={Boolean(fieldError(state, "newPassword"))}
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="confirmPassword"
            required
            error={fieldError(state, "confirmPassword")}
          >
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              required
              invalid={Boolean(fieldError(state, "confirmPassword"))}
            />
          </Field>

          <div>
            <SubmitButton pendingLabel="Updating…">
              Update password
            </SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
