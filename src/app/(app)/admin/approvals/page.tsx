import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";

import { reviewLeaveRequest } from "@/app/actions/leave";
import { reviewExpense, reviewWorkLog } from "@/app/actions/work";
import { ReviewPanel } from "@/components/admin/review-panel";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/dal";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { enumParam, type SearchParams } from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Approvals",
};

const TABS = ["leave", "work", "expenses"] as const;

export default async function ApprovalsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const tab = enumParam(searchParams, "tab", TABS) ?? "leave";

  // Counts drive the tab badges, so all three are always needed.
  const [leaveCount, workCount, expenseCount] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.dailyWorkLog.count({ where: { status: "SUBMITTED" } }),
    prisma.expense.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Everything waiting on a decision from you."
        breadcrumbs={[{ label: "Administration" }, { label: "Approvals" }]}
      />

      <Card>
        <LinkTabs
          basePath="/admin/approvals"
          active={tab}
          tabs={[
            { value: "leave", label: "Leave", count: leaveCount },
            { value: "work", label: "Work reports", count: workCount },
            { value: "expenses", label: "Expenses", count: expenseCount },
          ]}
        />

        {tab === "leave" && <LeaveQueue />}
        {tab === "work" && <WorkQueue />}
        {tab === "expenses" && <ExpenseQueue />}
      </Card>
    </>
  );
}

async function LeaveQueue() {
  const requests = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, avatarUrl: true, employeeCode: true } },
    },
  });

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<CheckCheck />}
        title="No leave to review"
        description="Every leave request has been dealt with."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            <Avatar
              name={request.user.name}
              src={request.user.avatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-fg">
                {request.user.name}
                <span className="ml-2 font-normal text-fg-subtle">
                  {request.user.employeeCode}
                </span>
              </p>

              <p className="mt-0.5 text-[13px] text-fg-muted">
                <span className="font-medium text-fg">
                  {toMoney(request.days)} day
                  {toMoney(request.days) === 1 ? "" : "s"}
                </span>{" "}
                of {humanizeEnum(request.type).toLowerCase()} leave ·{" "}
                {formatDate(request.startDate)}
                {request.startDate.getTime() !== request.endDate.getTime()
                  ? ` – ${formatDate(request.endDate)}`
                  : ""}
              </p>

              <p className="mt-1.5 text-[13px] leading-relaxed text-fg">
                {request.reason}
              </p>

              <p className="mt-1 text-[11.5px] text-fg-subtle">
                Requested {formatRelative(request.createdAt)}
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:pl-4">
            <ReviewPanel action={reviewLeaveRequest} id={request.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function WorkQueue() {
  const logs = await prisma.dailyWorkLog.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { date: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, avatarUrl: true, employeeCode: true } },
      customer: { select: { name: true, companyName: true } },
    },
  });

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<CheckCheck />}
        title="No work reports to review"
        description="Everything submitted has been reviewed."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            <Avatar name={log.user.name} src={log.user.avatarUrl} size="md" />
            <div className="min-w-0">
              <a
                href={`/work-logs/${log.id}`}
                className="text-[14px] font-semibold text-fg hover:text-accent hover:underline"
              >
                {log.title}
              </a>

              <p className="mt-0.5 text-[13px] text-fg-muted">
                {log.user.name} · {formatDate(log.date)} ·{" "}
                {toMoney(log.hoursSpent)} hours
                {log.customer
                  ? ` · ${log.customer.companyName ?? log.customer.name}`
                  : ""}
              </p>

              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-fg">
                {log.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:pl-4">
            <ReviewPanel action={reviewWorkLog} id={log.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function ExpenseQueue() {
  const expenses = await prisma.expense.findMany({
    where: { status: "PENDING" },
    orderBy: { date: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, avatarUrl: true, employeeCode: true } },
      workLog: { select: { id: true, title: true } },
    },
  });

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<CheckCheck />}
        title="No expense claims to review"
        description="Every claim has been dealt with."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            <Avatar
              name={expense.user.name}
              src={expense.user.avatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-fg">
                {formatCurrency(expense.amount)}
                <StatusBadge status={expense.category} dot={false} />
              </p>

              <p className="mt-0.5 text-[13px] text-fg-muted">
                {expense.user.name} · {formatDate(expense.date)}
              </p>

              <p className="mt-1.5 text-[13px] leading-relaxed text-fg">
                {expense.description}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px]">
                {expense.workLog && (
                  <a
                    href={`/work-logs/${expense.workLog.id}`}
                    className="text-accent hover:underline"
                  >
                    {expense.workLog.title}
                  </a>
                )}
                {expense.receiptUrl && (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    View receipt
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 lg:pl-4">
            <ReviewPanel
              action={reviewExpense}
              id={expense.id}
              extraChoice={{ value: "REIMBURSED", label: "Mark reimbursed" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
