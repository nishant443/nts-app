import type { Metadata } from "next";
import { Plus, ShoppingCart } from "lucide-react";

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
  title: "Purchase orders",
};

const STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

interface OrderRow {
  id: string;
  number: string;
  date: Date;
  expectedDate: Date | null;
  status: string;
  total: number;
  vendor: string;
}

export default async function PurchaseOrdersPage(props: {
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
            {
              vendor: {
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
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        date: true,
        expectedDate: true,
        status: true,
        total: true,
        vendor: { select: { companyName: true, name: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  const rows: OrderRow[] = records.map((record) => ({
    id: record.id,
    number: record.number,
    date: record.date,
    expectedDate: record.expectedDate,
    status: record.status,
    total: toMoney(record.total),
    vendor: record.vendor.companyName ?? record.vendor.name,
  }));

  const columns: Column<OrderRow>[] = [
    {
      key: "number",
      header: "Number",
      role: "primary",
      cell: (row) => <span className="font-mono text-[13px]">{row.number}</span>,
    },
    {
      key: "vendor",
      header: "Vendor",
      role: "secondary",
      cell: (row) => row.vendor,
    },
    {
      key: "date",
      header: "Raised",
      mobileLabel: "Raised",
      cell: (row) => <span className="tnum">{formatDate(row.date)}</span>,
    },
    {
      key: "expected",
      header: "Expected",
      mobileLabel: "Expected",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatDate(row.expectedDate)}
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
        title="Purchase orders"
        description="Parts and services NTS buys in from suppliers."
        actions={
          isAdmin ? (
            <Button href="/purchase-orders/new" variant="primary">
              <Plus aria-hidden="true" />
              New order
            </Button>
          ) : undefined
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search number or vendor…"
          dateRange
          selects={[
            {
              name: "status",
              label: "Status",
              options: STATUSES.map((value) => ({
                value,
                label:
                  value === "PARTIALLY_RECEIVED"
                    ? "Partially received"
                    : value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/purchase-orders/${row.id}`}
          empty={
            <EmptyState
              icon={<ShoppingCart />}
              title="No purchase orders"
              description="Raise an order against a supplier to track what is on the way."
              action={
                isAdmin
                  ? { label: "New order", href: "/purchase-orders/new" }
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
