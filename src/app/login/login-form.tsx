"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, LogIn } from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { Field, FormError, Input } from "@/components/ui/field";
import { emptyFormState } from "@/lib/form-state";

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError>{state.error}</FormError>

      <Field label="Email address" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@ntss.co.in"
          required
          autoFocus
          invalid={Boolean(state.error)}
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          required
          invalid={Boolean(state.error)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

/**
 * Split out so `useFormStatus` reads the status of the enclosing form — the
 * hook only reports pending state for a form above it in the tree.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[15px] font-semibold text-accent-fg shadow-card transition-[background-color,transform] duration-150 hover:bg-accent-hover active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Signing in…
        </>
      ) : (
        <>
          <LogIn aria-hidden="true" className="size-4" />
          Sign in
        </>
      )}
    </button>
  );
}
