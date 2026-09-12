import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";

import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { pageWindow, type SearchParams } from "@/lib/query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const { page, perPage, skip, take } = pageWindow(searchParams, 30);

  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread > 0 ? `${unread} unread` : "You are all caught up."
        }
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />

      <Card>
        <CardHeader title="Recent activity" />

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title="Nothing here yet"
            description="Approvals, payslips and payment updates will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => {
              const isUnread = notification.readAt === null;

              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      isUnread ? "bg-accent" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13.5px]",
                        isUnread
                          ? "font-semibold text-fg"
                          : "font-medium text-fg-muted",
                      )}
                    >
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-fg-muted">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11.5px] text-fg-subtle">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={notification.id}>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted sm:px-5"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-4 py-3.5 sm:px-5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Pagination page={page} perPage={perPage} total={total} />
      </Card>
    </>
  );
}
