"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { AuthSubmitButton, authInputClass } from "@/app/login/auth-fields";
import { FormError } from "@/components/ui/field";
import { businessClock } from "@/lib/dates";
import { emptyFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

function greeting(): string {
  const { hour } = businessClock();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const noop = () => () => {};

export function LoginForm({
  notice,
}: {
  notice?: { title: string; body: string };
}) {
  const [state, formAction] = useActionState(signIn, emptyFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const hello = useSyncExternalStore(noop, greeting, () => null);

  const invalid = Boolean(state.error);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="text-center">
        <p className="h-5 text-[13px] font-medium text-accent">{hello}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-fg">
          Sign in to NTS
        </h1>
        <p className="mt-1.5 text-[13.5px] text-fg-muted">
          Enter your work email and password to continue.
        </p>
      </div>

      {notice && !state.error && state.ts === undefined && (
        <div
          role="status"
          className="animate-fade-in flex gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3"
        >
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-[18px] shrink-0 text-warning"
          />
          <div>
            <p className="text-[13.5px] font-semibold text-fg">
              {notice.title}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
              {notice.body}
            </p>
          </div>
        </div>
      )}

      <FormError>{state.error}</FormError>

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
          aria-invalid={invalid || undefined}
          className={cn(
            authInputClass,
            invalid ? "border-danger" : "border-border-strong/70",
          )}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
          Password
        </span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            required
            aria-invalid={invalid || undefined}
            onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
            className={cn(
              authInputClass,
              "pr-14",
              invalid ? "border-danger" : "border-border-strong/70",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-accent-soft hover:text-accent"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-[18px]" />
            ) : (
              <Eye aria-hidden="true" className="size-[18px]" />
            )}
          </button>
        </span>
        {capsLock && (
          <span className="animate-fade-in mt-1.5 block px-1 text-[12.5px] text-warning">
            Caps Lock is on.
          </span>
        )}
      </label>

      <AuthSubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
