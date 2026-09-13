"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
} from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { FormError } from "@/components/ui/field";
import { emptyFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

/** "Good morning" and friends — computed on the client so it uses local time. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const noop = () => () => {};

export function LoginForm({
  notice,
}: {
  /** Explains an involuntary sign-out; shown until the first submit. */
  notice?: { title: string; body: string };
}) {
  const [state, formAction] = useActionState(signIn, emptyFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // Server renders nothing here; the greeting fills in after hydration, so the
  // server's clock never disagrees with the visitor's.
  const hello = useSyncExternalStore(noop, greeting, () => null);

  const invalid = Boolean(state.error);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div>
        <p className="h-5 text-[13px] font-medium text-accent">{hello}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-fg">
          Sign in to NTS
        </h1>
      </div>

      {notice && !state.error && state.ts === undefined && (
        <div
          role="status"
          className="animate-fade-in flex gap-3 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3"
        >
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-[18px] shrink-0 text-warning"
          />
          <div>
            <p className="text-[13.5px] font-semibold text-fg">{notice.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
              {notice.body}
            </p>
          </div>
        </div>
      )}

      <FormError>{state.error}</FormError>

      <label className="group block">
        <span className="mb-1.5 block text-[13px] font-medium text-fg">
          Email
        </span>
        <span className="relative block">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-accent"
          />
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
              "h-12 w-full rounded-xl border bg-surface pl-11 pr-4 text-[15px] text-fg outline-none transition-[border-color,box-shadow]",
              "placeholder:text-fg-subtle focus:border-accent focus:ring-4 focus:ring-accent/15",
              invalid ? "border-danger" : "border-border-strong",
            )}
          />
        </span>
      </label>

      <label className="group block">
        <span className="mb-1.5 block text-[13px] font-medium text-fg">
          Password
        </span>
        <span className="relative block">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-accent"
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            required
            aria-invalid={invalid || undefined}
            onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
            className={cn(
              "h-12 w-full rounded-xl border bg-surface pl-11 pr-12 text-[15px] text-fg outline-none transition-[border-color,box-shadow]",
              "placeholder:text-fg-subtle focus:border-accent focus:ring-4 focus:ring-accent/15",
              invalid ? "border-danger" : "border-border-strong",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-[18px]" />
            ) : (
              <Eye aria-hidden="true" className="size-[18px]" />
            )}
          </button>
        </span>
        {capsLock && (
          <span className="animate-fade-in mt-1.5 block text-[12.5px] text-warning">
            Caps Lock is on.
          </span>
        )}
      </label>

      <SubmitButton />

      <p className="text-center text-[13px] text-fg-subtle">
        Forgotten your password? Ask your administrator to reset it.
      </p>
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
      className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-fg shadow-raised transition-[background-color,transform,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-overlay active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-[18px] animate-spin" />
          Signing in…
        </>
      ) : (
        <>
          Sign in
          <ArrowRight
            aria-hidden="true"
            className="size-[18px] transition-transform duration-200 group-hover:translate-x-1"
          />
        </>
      )}
    </button>
  );
}
