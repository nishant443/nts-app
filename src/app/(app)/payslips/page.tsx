import type { Metadata } from "next";
import { BadgeIndianRupee, ExternalLink } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/dal";
import { formatMonthYear } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pageWindow, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "My payslips",
};

interface PayslipRow {
  id: string;
  month: number;
  year: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  lopDays: number;
}

export default async function PayslipsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const { page, perPage, skip, take } = pageWindow(searchParams);

  // Only this employee's payslips, and only from published runs — draft
  // figures are not final.
  const where = {
    userId: user.id,
    payrollRun: { status: { in: ["FINALIZED" as const, "PAID" as const] } },
  };

  const [records, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip,
      take,
      select: {
        id: true,
        month: true,
        year: true,
        grossEarnings: true,
        totalDeductions: true,
        netPay: true,
        lopDays: true,
      },
    }),
    prisma.payslip.count({ where }),
  ]);

  const rows: PayslipRow[] = records.map((record) => ({
    id: record.id,
    month: record.month,
    year: record.year,
    grossEarnings: toMoney(record.grossEarnings),
    totalDeductions: toMoney(record.totalDeductions),
    netPay: toMoney(record.netPay),
    lopDays: toMoney(record.lopDays),
  }));

  const columns: Column<PayslipRow>[] = [
    {
      key: "period",
      header: "Period",
      role: "primary",
      cell: (row) => formatMonthYear(row.month, row.year),
    },
    {
      key: "lop",
      header: "Loss of pay",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.lopDays > 0 ? `${row.lopDays} day(s) LOP` : "Full month"}
        </span>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      mobileLabel: "Gross",
      align: "right",
      cell: (row) => (
        <span className="tnum">{formatCurrency(row.grossEarnings)}</span>
      ),
    },
    {
      key: "deductions",
      header: "Deductions",
      mobileLabel: "Deductions",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatCurrency(row.totalDeductions)}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net pay",
      mobileLabel: "Net pay",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold text-fg">
          {formatCurrency(row.netPay)}
        </span>
      ),
    },
    {
      key: "download",
      header: "",
      align: "right",
      mobileLabel: "Payslip",
      cell: (row) => (
        <a
          href={`/api/pdf/payslip/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          PDF
        </a>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My payslips"
        description="Published payslips, newest first."
      />

      <Card>
        <CardHeader title="Payslips" description={`${total} on record`} />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<BadgeIndianRupee />}
              title="No payslips yet"
              description="Payslips appear here once payroll for a month has been finalized."
            />
          }
        />

        <Pagination page={page} perPage={perPage} total={total} />
      </Card>
    </>
  );
}
