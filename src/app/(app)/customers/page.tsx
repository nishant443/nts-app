import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  carryParams,
  enumParam,
  pageWindow,
  param,
  searchFilter,
  type SearchParams,
} from "@/lib/query";

export const metadata: Metadata = {
  title: "Customers",
};

const TYPES = ["LEAD", "ACTIVE", "INACTIVE", "VENDOR"] as const;

interface CustomerRow {
  id: string;
  name: string;
  companyName: string | null;
  type: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  createdAt: Date;
  owner: { name: string } | null;
  _count: { invoices: number; quotations: number };
}

export default async function CustomersPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();

  const searchParams = await props.searchParams;
  const term = param(searchParams, "q");
  const type = enumParam(searchParams, "type", TYPES);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    ...(type ? { type } : {}),
    ...(searchFilter(term, [
      "name",
      "companyName",
      "email",
      "phone",
      "gstin",
      "city",
    ]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        companyName: true,
        type: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        gstin: true,
        createdAt: true,
        owner: { select: { name: true } },
        _count: { select: { invoices: true, quotations: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(carryParams(searchParams, ["q", "type"]))
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, value as string]),
  ).toString();

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      role: "primary",
      cell: (row) => row.companyName ?? row.name,
    },
    {
      key: "contact",
      header: "Contact",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.companyName ? `${row.name} · ` : ""}
          {row.phone ?? row.email ?? "No contact details"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobileLabel: "Type",
      cell: (row) => <StatusBadge status={row.type} />,
    },
    {
      key: "location",
      header: "Location",
      mobileLabel: "Location",
      cell: (row) =>
        [row.city, row.state].filter(Boolean).join(", ") || (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      mobileLabel: "GSTIN",
      hideOnMobile: true,
      cell: (row) =>
        row.gstin ? (
          <span className="font-mono text-[12px]">{row.gstin}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "activity",
      header: "Documents",
      mobileLabel: "Documents",
      align: "right",
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {row._count.quotations} qt · {row._count.invoices} inv
        </span>
      ),
    },
    {
      key: "added",
      header: "Added",
      mobileLabel: "Added",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every company NTS works with — clients, leads and suppliers."
        actions={
          <>
            <ExportMenu basePath="/api/export/customers" query={exportQuery} />
            <Button href="/customers/new" variant="primary">
              <Plus aria-hidden="true" />
              Add customer
            </Button>
          </>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search name, company, GSTIN…"
          selects={[
            {
              name: "type",
              label: "Types",
              options: TYPES.map((value) => ({
                value,
                label:
                  value === "ACTIVE"
                    ? "Active customer"
                    : value === "VENDOR"
                      ? "Vendor"
                      : value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/customers/${row.id}`}
          empty={
            <EmptyState
              icon={<Building2 />}
              title={
                term || type ? "No matching customers" : "No customers yet"
              }
              description={
                term || type
                  ? "Try a different search or clear the filters."
                  : "Add the companies you work with to start raising quotations and invoices."
              }
              action={
                term || type
                  ? undefined
                  : { label: "Add customer", href: "/customers/new" }
              }
            />
          }
        />

        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          baseParams={carryParams(searchParams, ["q", "type"])}
        />
      </Card>
    </>
  );
}
