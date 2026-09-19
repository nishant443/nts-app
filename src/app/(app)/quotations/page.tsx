import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
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

export const metadata: Metadata = {
  title: "Quotations",
};

const STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
] as const;

interface QuotationRow {
  id: string;
  number: string;
  date: Date;
  validUntil: Date | null;
  status: string;
  total: number;
  customer: string;
}

export default async function QuotationsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();

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

  const [records, total, valueAggregate] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        date: true,
        validUntil: true,
        status: true,
        total: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.quotation.count({ where }),
    prisma.quotation.aggregate({ where, _sum: { total: true } }),
  ]);

  const rows: QuotationRow[] = records.map((record) => ({
    id: record.id,
    number: record.number,
    date: record.date,
    validUntil: record.validUntil,
    status: record.status,
    total: toMoney(record.total),
    customer: record.customer.companyName ?? record.customer.name,
  }));

  const columns: Column<QuotationRow>[] = [
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
      key: "validUntil",
      header: "Valid until",
      mobileLabel: "Valid until",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">{formatDate(row.validUntil)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
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
        title="Quotations"
        description={`${total} quotation(s) worth ${formatCurrency(toMoney(valueAggregate._sum.total))}`}
        actions={
          <Button href="/quotations/new" variant="primary">
            <Plus aria-hidden="true" />
            New quotation
          </Button>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search number, customer, subject…"
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
          rowHref={(row) => `/quotations/${row.id}`}
          empty={
            <EmptyState
              icon={<FileText />}
              title="No quotations found"
              description="Quote a customer for a job and it will appear here."
              action={{ label: "New quotation", href: "/quotations/new" }}
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
