"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";

import { requestPasswordReset } from "@/app/actions/auth";
import { AuthSubmitButton, authInputClass } from "@/app/login/auth-fields";
import { FormError } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    emptyFormState,
  );

  const emailError = fieldError(state, "email");

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">
          Reset your password
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-muted">
          Enter your work email and we will send you a link to set a new
          password.
        </p>
      </div>

      {state.success ? (
        <div
          role="status"
          className="animate-fade-in flex gap-3 rounded-2xl border border-success/30 bg-success-soft px-4 py-3"
        >
          <MailCheck
            aria-hidden="true"
            className="mt-0.5 size-[18px] shrink-0 text-success"
          />
          <p className="text-[13.5px] leading-relaxed text-fg">
            {state.success}
          </p>
        </div>
      ) : (
        <FormError>{state.error}</FormError>
      )}

      <label className="block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@ntss.co.in"
          required
          autoFocus
          aria-invalid={Boolean(emailError) || undefined}
          className={cn(
            authInputClass,
            emailError ? "border-danger" : "border-border-strong/70",
          )}
        />
        {emailError && (
          <span className="mt-1.5 block px-1 text-[12.5px] text-danger">
            {emailError}
          </span>
        )}
      </label>

      <AuthSubmitButton label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
