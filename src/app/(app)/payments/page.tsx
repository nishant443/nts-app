import type { Metadata } from "next";
import { Plus, Wallet2 } from "lucide-react";

import { refreshOverdueInvoices } from "@/app/actions/payments";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { financialYearRange, formatDate, today } from "@/lib/dates";
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

export const metadata: Metadata = {
  title: "Payments",
};

const STATUSES = ["PENDING", "RECEIVED", "FAILED", "CANCELLED"] as const;

interface PaymentRow {
  id: string;
  date: Date;
  amount: number;
  mode: string;
  status: string;
  reference: string | null;
  customer: string;
  customerId: string;
  invoiceNumber: string | null;
  invoiceId: string | null;
}

export default async function PaymentsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  // Keep the overdue flag honest without needing a scheduled job.
  await refreshOverdueInvoices();

  const searchParams = await props.searchParams;
  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const dateRange = dateRangeFilter(searchParams);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    ...(status ? { status } : {}),
    ...(dateRange ? { date: dateRange } : {}),
    // An employee only sees payments for customers they own or invoices they
    // raised. Company-wide payment history is admin-only.
    ...(isAdmin
      ? {}
      : {
          OR: [
            { customer: { ownerId: user.id } },
            { invoice: { createdById: user.id } },
            { recordedById: user.id },
          ],
        }),
    ...(term
      ? {
          AND: [
            {
              OR: [
                { reference: { contains: term, mode: "insensitive" as const } },
                {
                  invoice: {
                    number: { contains: term, mode: "insensitive" as const },
                  },
                },
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
            },
          ],
        }
      : {}),
  };

  const fy = financialYearRange(today());

  const [records, total, receivedAggregate, outstandingInvoices] =
    await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take,
        select: {
          id: true,
          date: true,
          amount: true,
          mode: true,
          status: true,
          reference: true,
          customerId: true,
          customer: { select: { companyName: true, name: true } },
          invoiceId: true,
          invoice: { select: { number: true } },
        },
      }),
      prisma.payment.count({ where }),
      // Company-wide totals are computed only for admins.
      isAdmin
        ? prisma.payment.aggregate({
            where: {
              status: "RECEIVED",
              date: { gte: fy.from, lte: fy.to },
            },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
      isAdmin
        ? prisma.invoice.findMany({
            where: {
              status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
            },
            select: { total: true, amountPaid: true, dueDate: true },
          })
        : Promise.resolve([]),
    ]);

  const rows: PaymentRow[] = records.map((record) => ({
    id: record.id,
    date: record.date,
    amount: toMoney(record.amount),
    mode: record.mode,
    status: record.status,
    reference: record.reference,
    customer: record.customer.companyName ?? record.customer.name,
    customerId: record.customerId,
    invoiceNumber: record.invoice?.number ?? null,
    invoiceId: record.invoiceId,
  }));

  const now = today();
  let outstanding = 0;
  let overdue = 0;

  for (const invoice of outstandingInvoices) {
    const balance = round2(toMoney(invoice.total) - toMoney(invoice.amountPaid));
    if (balance <= 0.009) continue;
    outstanding += balance;
    if (invoice.dueDate && invoice.dueDate < now) overdue += balance;
  }

  const columns: Column<PaymentRow>[] = [
    {
      key: "customer",
      header: "Customer",
      role: "primary",
      cell: (row) => row.customer,
    },
    {
      key: "meta",
      header: "Reference",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.invoiceNumber ? `${row.invoiceNumber} · ` : ""}
          {row.mode}
          {row.reference ? ` · ${row.reference}` : ""}
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
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      mobileLabel: "Amount",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold text-fg">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description={
          isAdmin
            ? "Money received, and what is still to come in."
            : "Payments for the customers and invoices you look after."
        }
        actions={
          isAdmin ? (
            <Button href="/payments/new" variant="primary">
              <Plus aria-hidden="true" />
              Record payment
            </Button>
          ) : undefined
        }
      />

      {/* Company-wide money is rendered only for admins — and only computed
          for them, so the figures never reach an employee's payload. */}
      {isAdmin && (
        <StatGrid className="lg:grid-cols-3">
          <StatCard
            label="Received this FY"
            value={formatCurrency(toMoney(receivedAggregate?._sum.amount))}
            tone="success"
            icon={<Wallet2 />}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            tone={outstanding > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(overdue)}
            tone={overdue > 0 ? "danger" : "neutral"}
            href="/invoices?status=OVERDUE"
          />
        </StatGrid>
      )}

      <Card>
        <CardHeader title="Payment history" />
        <FilterBar
          searchPlaceholder="Search customer, invoice, UTR…"
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
          rowHref={(row) =>
            row.invoiceId
              ? `/invoices/${row.invoiceId}`
              : `/customers/${row.customerId}`
          }
          empty={
            <EmptyState
              icon={<Wallet2 />}
              title="No payments recorded"
              description={
                isAdmin
                  ? "Record a receipt against an invoice to start tracking collections."
                  : "No payments are linked to your customers yet."
              }
              action={
                isAdmin
                  ? { label: "Record payment", href: "/payments/new" }
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
