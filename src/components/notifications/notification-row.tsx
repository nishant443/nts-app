"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { markNotificationRead } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";

/**
 * One notification in the list. Opening it marks it read *before* following
 * its link, so the page you land on — and the bell in the top bar — already
 * show the new count. Rows without a link just mark themselves read.
 */
export function NotificationRow({
  id,
  href,
  isUnread,
  children,
}: {
  id: string;
  href: string | null;
  isUnread: boolean;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const open = () => {
    startTransition(async () => {
      if (isUnread) await markNotificationRead({ id });
      if (href) router.push(href);
      else router.refresh();
    });
  };

  const className = cn(
    "flex w-full gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
    (href || isUnread) && "hover:bg-surface-muted",
    pending && "opacity-60",
  );

  if (href) {
    return (
      <a
        href={href}
        onClick={(event) => {
          // Plain modifier clicks (new tab) keep default behaviour.
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          open();
        }}
        aria-busy={pending || undefined}
        className={className}
      >
        {children}
      </a>
    );
  }

  if (isUnread) {
    return (
      <button
        type="button"
        onClick={open}
        aria-busy={pending || undefined}
        title="Mark as read"
        className={className}
      >
        {children}
      </button>
    );
  }

  return <div className={className}>{children}</div>;
}
