import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, FileSpreadsheet, Users } from "lucide-react";

import { RunActions } from "@/components/payroll/run-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/dal";
import { formatMonthYear } from "@/lib/dates";
import { formatCurrency, round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(
  props: PageProps<"/admin/payroll/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    select: { month: true, year: true },
  });

  return {
    title: run ? `Payroll · ${formatMonthYear(run.month, run.year)}` : "Payroll",
  };
}

interface PayslipRow {
  id: string;
  name: string;
  employeeCode: string;
  presentDays: number;
  lopDays: number;
  gross: number;
  deductions: number;
  net: number;
}

export default async function PayrollRunPage(
  props: PageProps<"/admin/payroll/[id]">,
) {
  await requireAdmin();
  const { id } = await props.params;

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      payslips: {
        orderBy: { user: { employeeCode: "asc" } },
        include: {
          user: { select: { name: true, employeeCode: true } },
        },
      },
    },
  });

  if (!run) notFound();

  const rows: PayslipRow[] = run.payslips.map((payslip) => ({
    id: payslip.id,
    name: payslip.user.name,
    employeeCode: payslip.user.employeeCode,
    presentDays: toMoney(payslip.presentDays),
    lopDays: toMoney(payslip.lopDays),
    gross: toMoney(payslip.grossEarnings),
    deductions: toMoney(payslip.totalDeductions),
    net: toMoney(payslip.netPay),
  }));

  const totals = rows.reduce(
    (sum, row) => ({
      gross: round2(sum.gross + row.gross),
      deductions: round2(sum.deductions + row.deductions),
      net: round2(sum.net + row.net),
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  const columns: Column<PayslipRow>[] = [
    {
      key: "name",
      header: "Employee",
      role: "primary",
      cell: (row) => row.name,
    },
    {
      key: "code",
      header: "Code",
      role: "secondary",
      cell: (row) => <span className="text-fg-muted">{row.employeeCode}</span>,
    },
    {
      key: "present",
      header: "Present",
      mobileLabel: "Present",
      align: "right",
      cell: (row) => <span className="tnum">{row.presentDays}</span>,
    },
    {
      key: "lop",
      header: "LOP",
      mobileLabel: "Loss of pay",
      align: "right",
      cell: (row) =>
        row.lopDays > 0 ? (
          <span className="tnum font-medium text-warning">{row.lopDays}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "gross",
      header: "Gross",
      mobileLabel: "Gross",
      align: "right",
      hideOnMobile: true,
      cell: (row) => <span className="tnum">{formatCurrency(row.gross)}</span>,
    },
    {
      key: "deductions",
      header: "Deductions",
      mobileLabel: "Deductions",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatCurrency(row.deductions)}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net pay",
      mobileLabel: "Net pay",
      align: "right",
      cell: (row) => (
        <span className="tnum font-semibold">{formatCurrency(row.net)}</span>
      ),
    },
    {
      key: "pdf",
      header: "",
      align: "right",
      mobileLabel: "Payslip",
      cell: (row) => (
        <a
          href={`/api/pdf/payslip/${row.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <Download aria-hidden="true" className="size-3.5" />
          PDF
        </a>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={formatMonthYear(run.month, run.year)}
        description={`Created by ${run.createdBy.name}${run.notes ? ` · ${run.notes}` : ""}`}
        breadcrumbs={[
          { label: "Payroll", href: "/admin/payroll" },
          { label: formatMonthYear(run.month, run.year) },
        ]}
        actions={
          <>
            {run.payslips.length > 0 && (
              <Button
                href={`/api/export/payroll/${run.id}`}
                variant="secondary"
              >
                <FileSpreadsheet aria-hidden="true" />
                Export
              </Button>
            )}
            <RunActions
              runId={run.id}
              status={run.status}
              payslipCount={run.payslips.length}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={run.status} />
        {run.status === "DRAFT" && (
          <span className="text-[13px] text-fg-muted">
            Generate payslips to see the figures for this month.
          </span>
        )}
        {run.status === "PROCESSING" && (
          <span className="text-[13px] text-fg-muted">
            Not yet visible to employees — finalize to publish.
          </span>
        )}
      </div>

      <StatGrid className="lg:grid-cols-4">
        <StatCard
          label="Employees"
          value={run.payslips.length}
          icon={<Users />}
          tone="accent"
        />
        <StatCard label="Gross" value={formatCurrency(totals.gross)} tone="neutral" />
        <StatCard
          label="Deductions"
          value={formatCurrency(totals.deductions)}
          tone="warning"
        />
        <StatCard
          label="Net payable"
          value={formatCurrency(totals.net)}
          tone="success"
        />
      </StatGrid>

      <Card>
        <CardHeader title="Payslips" />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              title="No payslips generated yet"
              description="Generating builds a payslip for every active employee who has a salary structure in force."
            />
          }
        />
      </Card>
    </>
  );
}
