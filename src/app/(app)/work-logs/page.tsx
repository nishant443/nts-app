import type { Metadata } from "next";
import { ClipboardList, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { formatDate, monthRange, today } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  carryParams,
  dateRangeFilter,
  enumParam,
  pageWindow,
  param,
  type SearchParams,
} from "@/lib/query";

export const metadata: Metadata = {
  title: "My work",
};

const STATUSES = ["SUBMITTED", "APPROVED", "REJECTED"] as const;

interface WorkLogRow {
  id: string;
  date: Date;
  title: string;
  hoursSpent: number;
  status: string;
  customer: string | null;
  expenseCount: number;
}

export default async function WorkLogsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const dateRange = dateRangeFilter(searchParams);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    userId: user.id,
    ...(status ? { status } : {}),
    ...(dateRange ? { date: dateRange } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const now = today();
  const thisMonth = monthRange(now.getUTCMonth() + 1, now.getUTCFullYear());

  const [records, total, monthAggregate, pendingCount] = await Promise.all([
    prisma.dailyWorkLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      select: {
        id: true,
        date: true,
        title: true,
        hoursSpent: true,
        status: true,
        customer: { select: { companyName: true, name: true } },
        _count: { select: { expenses: true } },
      },
    }),
    prisma.dailyWorkLog.count({ where }),
    prisma.dailyWorkLog.aggregate({
      where: {
        userId: user.id,
        date: { gte: thisMonth.from, lte: thisMonth.to },
      },
      _sum: { hoursSpent: true },
      _count: true,
    }),
    prisma.dailyWorkLog.count({
      where: { userId: user.id, status: "SUBMITTED" },
    }),
  ]);

  const rows: WorkLogRow[] = records.map((record) => ({
    id: record.id,
    date: record.date,
    title: record.title,
    hoursSpent: toMoney(record.hoursSpent),
    status: record.status,
    customer: record.customer?.companyName ?? record.customer?.name ?? null,
    expenseCount: record._count.expenses,
  }));

  const columns: Column<WorkLogRow>[] = [
    {
      key: "title",
      header: "Work done",
      role: "primary",
      cell: (row) => row.title,
    },
    {
      key: "customer",
      header: "Customer",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.customer ?? "No customer linked"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      mobileLabel: "Date",
      cell: (row) => <span className="tnum">{formatDate(row.date)}</span>,
    },
    {
      key: "hours",
      header: "Hours",
      mobileLabel: "Hours",
      align: "right",
      cell: (row) => <span className="tnum">{row.hoursSpent}</span>,
    },
    {
      key: "expenses",
      header: "Expenses",
      mobileLabel: "Expenses",
      align: "right",
      hideOnMobile: true,
      cell: (row) =>
        row.expenseCount > 0 ? (
          <span className="tnum text-fg-muted">{row.expenseCount}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="My work"
        description="What you worked on each day, and where it stands for review."
        actions={
          <Button href="/work-logs/new" variant="primary">
            <Plus aria-hidden="true" />
            Log work
          </Button>
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard
          label="Reports this month"
          value={monthAggregate._count}
          tone="accent"
        />
        <StatCard
          label="Hours this month"
          value={toMoney(monthAggregate._sum.hoursSpent)}
          tone="neutral"
        />
        <StatCard
          label="Awaiting review"
          value={pendingCount}
          tone={pendingCount > 0 ? "warning" : "success"}
        />
      </StatGrid>

      <Card>
        <FilterBar
          searchPlaceholder="Search what you worked on…"
          dateRange
          selects={[
            {
              name: "status",
              label: "Status",
              options: STATUSES.map((value) => ({
                value,
                label: value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/work-logs/${row.id}`}
          empty={
            <EmptyState
              icon={<ClipboardList />}
              title="Nothing logged yet"
              description="Record what you worked on so it can be reviewed and billed."
              action={{ label: "Log today's work", href: "/work-logs/new" }}
            />
          }
        />

        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          baseParams={carryParams(searchParams, ["q", "status", "from", "to"])}
        />
      </Card>
    </>
  );
}
