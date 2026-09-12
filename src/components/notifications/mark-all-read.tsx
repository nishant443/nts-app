"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { markAllNotificationsRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const markAll = () => {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button variant="secondary" onClick={markAll} disabled={pending}>
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <CheckCheck aria-hidden="true" />
      )}
      Mark all read
    </Button>
  );
}
