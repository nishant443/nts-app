import type { Metadata } from "next";
import { Plus, ScrollText } from "lucide-react";

import { LeaveRowActions } from "@/components/leave/leave-row-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pageWindow, type SearchParams } from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My leave",
};

interface LeaveRow {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
}

export default async function LeavePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const year = today().getUTCFullYear();

  const [records, total, balances] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
      skip,
      take,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        days: true,
        reason: true,
        status: true,
        reviewNote: true,
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.count({ where: { userId: user.id } }),
    prisma.leaveBalance.findMany({
      where: { userId: user.id, year },
      orderBy: { type: "asc" },
      select: { type: true, allocated: true, used: true },
    }),
  ]);

  const rows: LeaveRow[] = records.map((record) => ({
    id: record.id,
    type: record.type,
    startDate: record.startDate,
    endDate: record.endDate,
    days: toMoney(record.days),
    reason: record.reason,
    status: record.status,
    reviewNote: record.reviewNote,
    reviewedBy: record.reviewedBy?.name ?? null,
  }));

  const columns: Column<LeaveRow>[] = [
    {
      key: "type",
      header: "Type",
      role: "primary",
      cell: (row) => `${humanizeEnum(row.type)} leave`,
    },
    {
      key: "dates",
      header: "Dates",
      role: "secondary",
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatDate(row.startDate)}
          {row.startDate.getTime() !== row.endDate.getTime()
            ? ` – ${formatDate(row.endDate)}`
            : ""}
        </span>
      ),
    },
    {
      key: "days",
      header: "Days",
      mobileLabel: "Days",
      align: "right",
      cell: (row) => <span className="tnum">{row.days}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      mobileLabel: "Reason",
      hideOnMobile: true,
      cell: (row) => (
        <span className="line-clamp-1 text-fg-muted" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.status} />
          {row.reviewNote && (
            <span className="text-[11.5px] text-fg-subtle">
              {row.reviewNote}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Actions",
      cell: (row) =>
        row.status === "PENDING" ? <LeaveRowActions id={row.id} /> : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="My leave"
        description="Request time off and track where each request stands."
        actions={
          <Button href="/leave/new" variant="primary">
            <Plus aria-hidden="true" />
            Request leave
          </Button>
        }
      />

      {balances.length > 0 && (
        <Card>
          <CardHeader title={`Balance for ${year}`} />
          <CardBody className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {balances.map((balance) => {
              const allocated = toMoney(balance.allocated);
              const used = toMoney(balance.used);
              const remaining = Math.max(0, allocated - used);
              const percent = allocated > 0 ? (used / allocated) * 100 : 0;

              return (
                <div key={balance.type} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-fg">
                      {humanizeEnum(balance.type)}
                    </span>
                    <span className="tnum text-[12.5px] text-fg-muted">
                      <span className="font-semibold text-fg">{remaining}</span>{" "}
                      / {allocated}
                    </span>
                  </div>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                    <span
                      className="block h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Requests" />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<ScrollText />}
              title="No leave requests yet"
              description="Request time off and your administrator will be notified."
              action={{ label: "Request leave", href: "/leave/new" }}
            />
          }
        />
        <Pagination page={page} perPage={perPage} total={total} />
      </Card>
    </>
  );
}
