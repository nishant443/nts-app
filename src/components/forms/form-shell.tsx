"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

/**
 * Shared bits every form in the app uses: the error/success banners and a
 * submit button that knows when its own form is in flight.
 */

export function FormBanners({ state }: { state: FormState }) {
  return (
    <>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.success}</FormSuccess>
    </>
  );
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
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  block?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending} block={block}>
      {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
