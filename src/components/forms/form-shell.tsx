"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { useSuccessPopup } from "@/components/ui/success-popup";
import type { FormState } from "@/lib/form-state";

/**
 * Shared bits every form in the app uses: the error banner, the "saved" pop-up
 * and a submit button that knows when its own form is in flight.
 *
 * Errors stay inline, next to the fields that need correcting. Success is a
 * centred pop-up (see `ui/success-popup`) so it cannot be missed.
 */

export function FormBanners({ state }: { state: FormState }) {
  useSuccessPopup(state);
  return <FormError>{state.error}</FormError>;
}

/**
 * `useFormStatus` only reports for a form *above* it in the tree, so this must
 * stay a separate component rendered inside the `<form>`.
 */
export function SubmitButton({
  children = "Save",
  pendingLabel = "Saving…",
  variant = "primary",
  block,
  name,
  value,
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  block?: boolean;
  /** For forms with more than one submit: which one was pressed. */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      block={block}
      name={name}
      value={value}
    >
      {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
