import type { Metadata } from "next";
import { Plus, Receipt } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import { formatCurrency, round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  carryParams,
  dateRangeFilter,
  enumParam,
  pageWindow,
  param,
  type SearchParams,
} from "@/lib/query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Invoices",
};

const STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

interface InvoiceRow {
  id: string;
  number: string;
  date: Date;
  dueDate: Date | null;
  status: string;
  total: number;
  balance: number;
  customer: string;
  overdue: boolean;
}

export default async function InvoicesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const searchParams = await props.searchParams;
  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const dateRange = dateRangeFilter(searchParams);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    ...(status ? { status } : {}),
    ...(dateRange ? { date: dateRange } : {}),
    ...(term
      ? {
          OR: [
            { number: { contains: term, mode: "insensitive" as const } },
            { subject: { contains: term, mode: "insensitive" as const } },
            {
              customer: {
                OR: [
                  { name: { contains: term, mode: "insensitive" as const } },
                  {
                    companyName: {
                      contains: term,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        date: true,
        dueDate: true,
        status: true,
        total: true,
        amountPaid: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const now = today();

  const rows: InvoiceRow[] = records.map((record) => ({
    id: record.id,
    number: record.number,
    date: record.date,
    dueDate: record.dueDate,
    status: record.status,
    total: toMoney(record.total),
    balance: round2(toMoney(record.total) - toMoney(record.amountPaid)),
    customer: record.customer.companyName ?? record.customer.name,
    overdue: Boolean(
      record.dueDate &&
        record.dueDate < now &&
        toMoney(record.total) - toMoney(record.amountPaid) > 0.009,
    ),
  }));

  const columns: Column<InvoiceRow>[] = [
    {
      key: "number",
      header: "Number",
      role: "primary",
      cell: (row) => <span className="font-mono text-[13px]">{row.number}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      role: "secondary",
      cell: (row) => row.customer,
    },
    {
      key: "date",
      header: "Date",
      mobileLabel: "Date",
      cell: (row) => <span className="tnum">{formatDate(row.date)}</span>,
    },
    {
      key: "dueDate",
      header: "Due",
      mobileLabel: "Due",
      cell: (row) => (
        <span className={cn("tnum", row.overdue ? "font-medium text-danger" : "text-fg-muted")}>
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "balance",
      header: "Balance",
      mobileLabel: "Balance",
      align: "right",
      cell: (row) =>
        row.balance > 0.009 ? (
          <span className="tnum font-medium text-warning">
            {formatCurrency(row.balance)}
          </span>
        ) : (
          <span className="text-fg-subtle">Settled</span>
        ),
    },
    {
      key: "total",
      header: "Total",
      mobileLabel: "Total",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold">{formatCurrency(row.total)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        description={`${total} invoice(s) on record.`}
        actions={
          isAdmin ? (
            <Button href="/invoices/new" variant="primary">
              <Plus aria-hidden="true" />
              New invoice
            </Button>
          ) : undefined
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search number, customer, subject…"
          dateRange
          selects={[
            {
              name: "status",
              label: "Statuses",
              options: STATUSES.map((value) => ({
                value,
                label:
                  value === "PARTIALLY_PAID"
                    ? "Partially paid"
                    : value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/invoices/${row.id}`}
          empty={
            <EmptyState
              icon={<Receipt />}
              title="No invoices found"
              description={
                isAdmin
                  ? "Raise an invoice, or convert an accepted quotation."
                  : "There are no invoices matching this view."
              }
              action={
                isAdmin
                  ? { label: "New invoice", href: "/invoices/new" }
                  : undefined
              }
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
