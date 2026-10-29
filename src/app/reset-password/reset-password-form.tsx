"use client";

import { useActionState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { resetPassword } from "@/app/actions/auth";
import { AuthSubmitButton, authInputClass } from "@/app/login/auth-fields";
import { FormError } from "@/components/ui/field";
import { emptyFormState, fieldError } from "@/lib/form-state";
import { cn } from "@/lib/utils";

// The token arrives in the URL fragment. It is read once and then removed from
// the address bar so it does not linger in history or get copied by accident.
let capturedToken: string | null = null;

function readToken(): string {
  capturedToken ??=
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  return capturedToken;
}

const noop = () => () => {};

export function ResetPasswordForm() {
  const token = useSyncExternalStore(noop, readToken, () => null);
  const [state, formAction] = useActionState(resetPassword, emptyFormState);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (token === null) return null;

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-fg">
            This link is not valid
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">
            Open the reset link from your email again, or request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="font-medium text-accent hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">
          Set a new password
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-muted">
          At least 10 characters, with an upper case letter, a lower case
          letter and a number.
        </p>
      </div>

      <FormError>{state.error}</FormError>

      <input type="hidden" name="token" value={token} />

      <PasswordField
        name="newPassword"
        label="New password"
        error={fieldError(state, "newPassword")}
        autoFocus
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        error={fieldError(state, "confirmPassword")}
      />

      <AuthSubmitButton label="Save new password" pendingLabel="Saving…" />
    </form>
  );
}

function PasswordField({
  name,
  label,
  error,
  autoFocus,
}: {
  name: string;
  label: string;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
        {label}
      </span>
      <input
        name={name}
        type="password"
        autoComplete="new-password"
        required
        autoFocus={autoFocus}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          authInputClass,
          error ? "border-danger" : "border-border-strong/70",
        )}
      />
      {error && (
        <span className="mt-1.5 block px-1 text-[12.5px] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
