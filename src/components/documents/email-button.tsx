"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { emailDocument } from "@/app/actions/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Sends the document to the customer with the PDF attached.
 *
 * Shows the address it is about to use and lets it be overridden for this send,
 * because the contact on file is often not the person who handles purchase
 * orders. When SMTP is not configured the button explains that rather than
 * failing on press.
 */
export function EmailDocumentButton({
  kind,
  id,
  customerEmail,
  customerName,
  configured,
}: {
  kind: "quotation" | "invoice";
  id: string;
  customerEmail: string | null;
  customerName: string;
  configured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(customerEmail ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!configured) {
    return (
      <Button
        variant="secondary"
        disabled
        title="Email has not been set up. Ask your administrator to configure SMTP."
      >
        <Mail aria-hidden="true" />
        Email
      </Button>
    );
  }

  const send = () => {
    startTransition(async () => {
      const result = await emailDocument({
        kind,
        id,
        to: to.trim() || undefined,
      });

      if (result.ok) {
        toast.success(`Sent to ${result.data.sentTo}.`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Mail aria-hidden="true" />
        Email
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:w-auto sm:min-w-[22rem]">
      <label
        htmlFor={`email-to-${id}`}
        className="text-[12px] font-medium text-fg-muted"
      >
        Send to {customerName}
      </label>

      <Input
        id={`email-to-${id}`}
        type="email"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        placeholder="purchase@customer.example"
        autoFocus
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={send}
          disabled={pending || !to.trim()}
        >
          {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {pending ? "Sending…" : "Send with PDF"}
        </Button>
      </div>
    </div>
  );
}
