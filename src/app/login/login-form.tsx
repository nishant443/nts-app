"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { FormError } from "@/components/ui/field";
import { businessClock } from "@/lib/dates";
import { emptyFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

/** "Good morning" and friends, on the company clock (IST) wherever you are. */
function greeting(): string {
  const { hour } = businessClock();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const noop = () => () => {};

const inputClass =
  "h-[3.25rem] w-full rounded-full border bg-white/80 px-5 text-[15px] text-fg outline-none " +
  "shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-[border-color,box-shadow,background-color] " +
  "placeholder:text-fg-subtle focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/15 " +
  "dark:bg-white/5 dark:focus:bg-white/10";

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
            inputClass,
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
              inputClass,
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
      className="group mt-1 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-accent-fg shadow-[0_10px_24px_-8px_rgb(26_109_255/0.6)] transition-[background-color,transform,box-shadow] duration-150 hover:bg-accent-hover hover:shadow-[0_14px_28px_-8px_rgb(26_109_255/0.6)] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
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
            className="size-[18px] transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </>
      )}
    </button>
  );
}
