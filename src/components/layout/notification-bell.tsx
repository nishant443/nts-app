import Link from "next/link";
import { Bell } from "lucide-react";

import { unreadCount } from "@/lib/notifications";

export async function NotificationBell({ userId }: { userId: string }) {
  const count = await unreadCount(userId);

  return (
    <Link
      href="/notifications"
      aria-label={
        count > 0
          ? `Notifications, ${count} unread`
          : "Notifications"
      }
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
    >
      <Bell aria-hidden="true" className="size-[18px]" />
      {count > 0 && (
        <span className="tnum absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-surface">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function NotificationBellFallback() {
  return (
    <span className="inline-flex size-9 items-center justify-center rounded-lg text-fg-subtle">
      <Bell aria-hidden="true" className="size-[18px]" />
    </span>
  );
}
