"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { useSuccessPopup } from "@/components/ui/success-popup";
import type { FormState } from "@/lib/form-state";

export function FormBanners({ state }: { state: FormState }) {
  useSuccessPopup(state);
  return <FormError>{state.error}</FormError>;
}

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
