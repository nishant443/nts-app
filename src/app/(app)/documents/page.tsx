import type { Metadata } from "next";
import { FileText, FolderOpen } from "lucide-react";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
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
  type SearchParams,
} from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Documents",
};

const OWNER_TYPES = ["CUSTOMER", "EMPLOYEE"] as const;

interface DocumentRow {
  id: string;
  name: string;
  category: string;
  ownerType: string;
  ownerLabel: string;
  url: string;
  sizeBytes: number | null;
  uploadedBy: string;
  createdAt: Date;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const searchParams = await props.searchParams;
  const term = param(searchParams, "q");
  const ownerType = enumParam(searchParams, "ownerType", OWNER_TYPES);
  const { page, perPage, skip, take } = pageWindow(searchParams);

  const where = {
    ...(ownerType ? { ownerType } : {}),
    ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}),
    // Employee documents are personal records. An employee sees only their own;
    // customer documents are shared business records everyone can see.
    ...(isAdmin
      ? {}
      : {
          OR: [
            { ownerType: { not: "EMPLOYEE" as const } },
            { ownerType: "EMPLOYEE" as const, ownerId: user.id },
          ],
        }),
  };

  const [records, total, customers, employees] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { uploadedBy: { select: { name: true } } },
    }),
    prisma.document.count({ where }),
    prisma.customer.findMany({
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { status: "ACTIVE" },
          orderBy: { employeeCode: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  // Owner ids are polymorphic, so resolve their labels from the lists we
  // already loaded rather than issuing a query per row.
  const customerNames = new Map(
    customers.map((customer) => [
      customer.id,
      customer.companyName ?? customer.name,
    ]),
  );
  const employeeNames = new Map(
    employees.map((employee) => [employee.id, employee.name]),
  );

  const rows: DocumentRow[] = records.map((record) => ({
    id: record.id,
    name: record.name,
    category: record.category,
    ownerType: record.ownerType,
    ownerLabel:
      record.ownerType === "CUSTOMER"
        ? (customerNames.get(record.ownerId) ?? "Unknown customer")
        : record.ownerType === "EMPLOYEE"
          ? (employeeNames.get(record.ownerId) ?? "Employee")
          : humanizeEnum(record.ownerType),
    url: record.url,
    sizeBytes: record.sizeBytes,
    uploadedBy: record.uploadedBy.name,
    createdAt: record.createdAt,
  }));

  const columns: Column<DocumentRow>[] = [
    {
      key: "name",
      header: "Document",
      role: "primary",
      cell: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-accent"
        >
          <FileText aria-hidden="true" className="size-4 shrink-0 text-accent" />
          {row.name}
        </a>
      ),
    },
    {
      key: "owner",
      header: "Belongs to",
      role: "secondary",
      cell: (row) => <span className="text-fg-muted">{row.ownerLabel}</span>,
    },
    {
      key: "category",
      header: "Category",
      mobileLabel: "Category",
      cell: (row) => <Badge>{row.category}</Badge>,
    },
    {
      key: "type",
      header: "Type",
      mobileLabel: "Type",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-fg-muted">{humanizeEnum(row.ownerType)}</span>
      ),
    },
    {
      key: "size",
      header: "Size",
      mobileLabel: "Size",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">{formatSize(row.sizeBytes)}</span>
      ),
    },
    {
      key: "added",
      header: "Added",
      mobileLabel: "Added",
      align: "right",
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Documents"
        description="Certificates, purchase bills, ID proofs and anything else worth keeping."
      />

      <DocumentUploadForm
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        employees={employees}
        canFileForOthers={isAdmin}
        currentUserId={user.id}
      />

      <Card>
        <CardHeader title="Library" description={`${total} document(s)`} />

        <FilterBar
          searchPlaceholder="Search document name…"
          selects={[
            {
              name: "ownerType",
              label: "Types",
              options: [
                { value: "CUSTOMER", label: "Customer" },
                { value: "EMPLOYEE", label: "Employee" },
              ],
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<FolderOpen />}
              title="No documents yet"
              description="Upload a certificate, bill or ID proof to keep it with the right record."
            />
          }
        />

        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          baseParams={carryParams(searchParams, ["q", "ownerType"])}
        />
      </Card>
    </>
  );
}
