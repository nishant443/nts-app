import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Wallet } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { PageHeader } from "@/components/ui/page-header";
import { assertOwnerOrAdmin, requireUser } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Work report",
};

export default async function WorkLogDetailPage(
  props: PageProps<"/work-logs/[id]">,
) {
  const user = await requireUser();
  const { id } = await props.params;

  const log = await prisma.dailyWorkLog.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      customer: { select: { id: true, name: true, companyName: true } },
      reviewedBy: { select: { name: true } },
      expenses: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          category: true,
          amount: true,
          status: true,
          description: true,
        },
      },
    },
  });

  if (!log) notFound();

  // An employee may only open their own reports.
  assertOwnerOrAdmin(user, log.userId);

  const canEdit =
    log.userId === user.id ? log.status !== "APPROVED" : user.role === "ADMIN";

  return (
    <>
      <PageHeader
        title={log.title}
        description={`${formatDate(log.date)} · ${toMoney(log.hoursSpent)} hours`}
        breadcrumbs={[
          { label: "My work", href: "/work-logs" },
          { label: formatDate(log.date) },
        ]}
        actions={
          canEdit ? (
            <Button href={`/work-logs/${log.id}/edit`} variant="secondary">
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={log.status} />
        {log.reviewedBy && (
          <span className="text-[13px] text-fg-muted">
            Reviewed by{" "}
            <span className="text-fg">{log.reviewedBy.name}</span>
            {log.reviewedAt ? ` on ${formatDate(log.reviewedAt)}` : ""}
          </span>
        )}
      </div>

      {log.reviewNote && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-warning">
            Reviewer&apos;s note
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg">
            {log.reviewNote}
          </p>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="What was done" />
          <CardBody>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-fg">
              {log.description}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <DetailList
              items={[
                { label: "Engineer", value: log.user.name },
                { label: "Date", value: formatDate(log.date) },
                { label: "Hours", value: toMoney(log.hoursSpent) },
                {
                  label: "Customer",
                  value: log.customer ? (
                    <a
                      href={`/customers/${log.customer.id}`}
                      className="text-accent hover:underline"
                    >
                      {log.customer.companyName ?? log.customer.name}
                    </a>
                  ) : null,
                },
                { label: "Submitted", value: formatDateTime(log.createdAt) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      {log.expenses.length > 0 && (
        <Card>
          <CardHeader
            title="Expenses on this visit"
            action={
              <Button href="/expenses" variant="ghost" size="sm">
                <Wallet aria-hidden="true" />
                All expenses
              </Button>
            }
          />
          <ul className="divide-y divide-border">
            {log.expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">
                    {humanizeEnum(expense.category)}
                  </p>
                  <p className="truncate text-[12px] text-fg-muted">
                    {expense.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-[13.5px] font-semibold text-fg">
                    {formatCurrency(expense.amount)}
                  </p>
                  <StatusBadge status={expense.status} dot={false} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
