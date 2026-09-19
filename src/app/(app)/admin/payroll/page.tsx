import type { Metadata } from "next";
import { BadgeIndianRupee } from "lucide-react";

import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { formatDate, formatMonthYear, today } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Payroll",
};

interface RunRow {
  id: string;
  month: number;
  year: number;
  status: string;
  payslipCount: number;
  netTotal: number;
  createdBy: string;
  finalizedAt: Date | null;
}

export default async function PayrollPage() {
  await requireAdmin();

  const runs = await prisma.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
    include: {
      createdBy: { select: { name: true } },
      payslips: { select: { netPay: true } },
    },
  });

  const rows: RunRow[] = runs.map((run) => ({
    id: run.id,
    month: run.month,
    year: run.year,
    status: run.status,
    payslipCount: run.payslips.length,
    netTotal: run.payslips.reduce(
      (sum, payslip) => sum + toMoney(payslip.netPay),
      0,
    ),
    createdBy: run.createdBy.name,
    finalizedAt: run.finalizedAt,
  }));

  const now = today();
  const previous = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );

  const columns: Column<RunRow>[] = [
    {
      key: "period",
      header: "Period",
      role: "primary",
      cell: (row) => formatMonthYear(row.month, row.year),
    },
    {
      key: "createdBy",
      header: "Created by",
      role: "secondary",
      cell: (row) => <span className="text-fg-muted">{row.createdBy}</span>,
    },
    {
      key: "payslips",
      header: "Payslips",
      mobileLabel: "Payslips",
      align: "right",
      cell: (row) => <span className="tnum">{row.payslipCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "finalized",
      header: "Finalized",
      mobileLabel: "Finalized",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">{formatDate(row.finalizedAt)}</span>
      ),
    },
    {
      key: "net",
      header: "Net payable",
      mobileLabel: "Net payable",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold">
          {formatCurrency(row.netTotal)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Run payroll for a month, then publish payslips to employees."
        breadcrumbs={[{ label: "Administration" }, { label: "Payroll" }]}
      />

      <PayrollRunForm
        defaultMonth={previous.getUTCMonth() + 1}
        defaultYear={previous.getUTCFullYear()}
      />

      <Card>
        <CardHeader title="Payroll runs" />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/admin/payroll/${row.id}`}
          empty={
            <EmptyState
              icon={<BadgeIndianRupee />}
              title="No payroll runs yet"
              description="Start a run for a month to generate payslips."
            />
          }
        />
      </Card>
    </>
  );
}
