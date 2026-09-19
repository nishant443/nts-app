"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { emailWorkLocation } from "@/app/actions/work-locations";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/components/ui/success-popup";


export function WorkLocationEmailButton({
  id,
  employeeName,
  configured,
}: {
  id: string;
  employeeName: string;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const send = () =>
    startTransition(async () => {
      const result = await emailWorkLocation({ id });
      if (result.ok) {
        showSuccess(`Location emailed to ${result.data.sentTo}.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={send}
      disabled={pending || !configured}
      title={
        configured
          ? `Email this location to ${employeeName}`
          : "Email has not been set up."
      }
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <Mail aria-hidden="true" />
      )}
      Email
    </Button>
  );
}
