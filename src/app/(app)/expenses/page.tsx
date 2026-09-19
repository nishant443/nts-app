import type { Metadata } from "next";
import { Plus, Wallet } from "lucide-react";

import { ExpenseRowActions } from "@/components/expenses/expense-row-actions";
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
import { describeExpenseLine } from "@/lib/expense-rates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  carryParams,
  dateRangeFilter,
  enumParam,
  pageWindow,
  param,
  type SearchParams,
} from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My expenses",
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const CATEGORIES = [
  "TRAVEL",
  "FUEL",
  "FOOD",
  "TOOLS",
  "MATERIAL",
  "LODGING",
  "COURIER",
  "OTHER",
] as const;

interface ExpenseRow {
  id: string;
  date: Date;
  lines: string[];
  amount: number;
  description: string | null;
  status: string;
  customerName: string | null;
  reviewNote: string | null;
}

export default async function ExpensesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const category = enumParam(searchParams, "category", CATEGORIES);
  const dateRange = dateRangeFilter(searchParams);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    userId: user.id,
    ...(status ? { status } : {}),
    ...(category ? { items: { some: { category } } } : {}),
    ...(dateRange ? { date: dateRange } : {}),
    ...(term
      ? { description: { contains: term, mode: "insensitive" as const } }
      : {}),
  };

  const now = today();
  const thisMonth = monthRange(now.getUTCMonth() + 1, now.getUTCFullYear());

  const [records, total, pending, approvedThisMonth] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      select: {
        id: true,
        date: true,
        amount: true,
        items: {
          orderBy: { position: "asc" },
          select: { category: true, distanceKm: true, foodType: true },
        },
        description: true,
        status: true,
        reviewNote: true,
        customer: { select: { name: true, companyName: true } },
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where: { userId: user.id, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        status: { in: ["APPROVED", "REIMBURSED"] },
        date: { gte: thisMonth.from, lte: thisMonth.to },
      },
      _sum: { amount: true },
    }),
  ]);

  const rows: ExpenseRow[] = records.map((record) => ({
    id: record.id,
    date: record.date,
    lines: record.items.map((item) => {
      const basis = describeExpenseLine({
        category: item.category,
        distanceKm: item.distanceKm === null ? null : toMoney(item.distanceKm),
        foodType: item.foodType,
      });
      return basis
        ? `${humanizeEnum(item.category)} (${basis})`
        : humanizeEnum(item.category);
    }),
    amount: toMoney(record.amount),
    description: record.description,
    status: record.status,
    customerName: record.customer
      ? (record.customer.companyName ?? record.customer.name)
      : null,
    reviewNote: record.reviewNote,
  }));

  const columns: Column<ExpenseRow>[] = [
    {
      key: "lines",
      header: "Expenses",
      role: "primary",
      cell: (row) => row.lines.join(" · "),
    },
    {
      key: "description",
      header: "Description",
      role: "secondary",
      cell: (row) => <span className="text-fg-muted">{row.description}</span>,
    },
    {
      key: "date",
      header: "Date",
      mobileLabel: "Date",
      cell: (row) => <span className="tnum">{formatDate(row.date)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      mobileLabel: "Customer",
      hideOnMobile: true,
      cell: (row) =>
        row.customerName ? (
          <span className="line-clamp-1 text-fg-muted">{row.customerName}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
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
      key: "amount",
      header: "Amount",
      mobileLabel: "Amount",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Actions",
      cell: (row) =>
        row.status === "REIMBURSED" ? null : (
          <ExpenseRowActions id={row.id} pending={row.status === "PENDING"} />
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My expenses"
        description="Out-of-pocket costs you have claimed back."
        actions={
          <Button href="/expenses/new" variant="primary">
            <Plus aria-hidden="true" />
            Add expense
          </Button>
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard
          label="Awaiting approval"
          value={formatCurrency(toMoney(pending._sum.amount))}
          tone={pending._count > 0 ? "warning" : "neutral"}
          hint={`${pending._count} claim(s)`}
        />
        <StatCard
          label="Approved this month"
          value={formatCurrency(toMoney(approvedThisMonth._sum.amount))}
          tone="success"
          hint="Paid with your salary"
        />
        <StatCard label="Total claims" value={total} tone="neutral" />
      </StatGrid>

      <Card>
        <FilterBar
          searchPlaceholder="Search description…"
          dateRange
          selects={[
            {
              name: "category",
              label: "Categories",
              options: CATEGORIES.map((value) => ({
                value,
                label: humanizeEnum(value),
              })),
            },
            {
              name: "status",
              label: "Status",
              options: STATUSES.map((value) => ({
                value,
                label: humanizeEnum(value),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<Wallet />}
              title="No expenses claimed"
              description="Add travel, fuel or other costs you paid for out of pocket."
              action={{ label: "Add expense", href: "/expenses/new" }}
            />
          }
        />

        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          baseParams={carryParams(searchParams, [
            "q",
            "status",
            "category",
            "from",
            "to",
          ])}
        />
      </Card>
    </>
  );
}
