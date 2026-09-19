import type { Metadata } from "next";
import { FileSpreadsheet, IndianRupee, Receipt, Wallet } from "lucide-react";

import { LazyRevenueChart } from "@/components/charts/lazy-revenue-chart";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/dal";
import { formatDate, formatDuration, today } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { dateRangeFilter, param, type SearchParams } from "@/lib/query";
import {
  defaultReportRange,
  getAttendanceReport,
  getExpenseReport,
  getSalesReport,
  type AttendanceReportRow,
  type ExpenseReportRow,
} from "@/lib/services/reports";
import { humanizeEnum } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reports",
};

interface CustomerRow {
  id: string;
  customer: string;
  invoiceCount: number;
  invoiced: number;
  received: number;
  outstanding: number;
}

export default async function ReportsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;

  const range = dateRangeFilter(searchParams);
  const fallback = defaultReportRange();
  const from = range?.gte ?? fallback.from;
  const to = range?.lte ?? fallback.to;

  const now = today();
  const month = Number(param(searchParams, "month")) || now.getUTCMonth() + 1;
  const year = Number(param(searchParams, "year")) || now.getUTCFullYear();

  const [sales, attendance, expenses] = await Promise.all([
    getSalesReport(from, to),
    getAttendanceReport(month, year),
    getExpenseReport(from, to),
  ]);

  const customerColumns: Column<CustomerRow>[] = [
    {
      key: "customer",
      header: "Customer",
      role: "primary",
      cell: (row) => row.customer,
    },
    {
      key: "count",
      header: "Invoices",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">{row.invoiceCount} invoice(s)</span>
      ),
    },
    {
      key: "invoiced",
      header: "Invoiced",
      mobileLabel: "Invoiced",
      align: "right",
      cell: (row) => (
        <span className="tnum font-medium">{formatCurrency(row.invoiced)}</span>
      ),
    },
    {
      key: "received",
      header: "Received",
      mobileLabel: "Received",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-success">{formatCurrency(row.received)}</span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      mobileLabel: "Outstanding",
      align: "right",
      cell: (row) =>
        row.outstanding > 0.009 ? (
          <span className="tnum font-medium text-warning">
            {formatCurrency(row.outstanding)}
          </span>
        ) : (
          <span className="text-fg-subtle">Settled</span>
        ),
    },
  ];

  const attendanceColumns: Column<AttendanceReportRow>[] = [
    { key: "name", header: "Employee", role: "primary", cell: (row) => row.name },
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
      cell: (row) => (
        <span className="tnum text-success">{row.present}</span>
      ),
    },
    {
      key: "half",
      header: "Half",
      mobileLabel: "Half days",
      align: "right",
      hideOnMobile: true,
      cell: (row) => <span className="tnum">{row.halfDay}</span>,
    },
    {
      key: "absent",
      header: "Absent",
      mobileLabel: "Absent",
      align: "right",
      cell: (row) => (
        <span className="tnum text-danger">{row.absent}</span>
      ),
    },
    {
      key: "leave",
      header: "Leave",
      mobileLabel: "On leave",
      align: "right",
      cell: (row) => <span className="tnum text-info">{row.onLeave}</span>,
    },
    {
      key: "hours",
      header: "Hours",
      mobileLabel: "Hours",
      align: "right",
      cell: (row) => (
        <span className="tnum">{formatDuration(row.workedMinutes)}</span>
      ),
    },
  ];

  const expenseColumns: Column<ExpenseReportRow>[] = [
    {
      key: "category",
      header: "Category",
      role: "primary",
      cell: (row) => humanizeEnum(row.category),
    },
    {
      key: "count",
      header: "Claims",
      role: "secondary",
      cell: (row) => <span className="text-fg-muted">{row.count} claim(s)</span>,
    },
    {
      key: "pending",
      header: "Pending",
      mobileLabel: "Pending",
      align: "right",
      cell: (row) => (
        <span className="tnum text-warning">{formatCurrency(row.pending)}</span>
      ),
    },
    {
      key: "approved",
      header: "Approved",
      mobileLabel: "Approved",
      align: "right",
      cell: (row) => (
        <span className="tnum text-success">{formatCurrency(row.approved)}</span>
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

  const exportQuery = `?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${formatDate(from)} – ${formatDate(to)}`}
        breadcrumbs={[{ label: "Administration" }, { label: "Reports" }]}
        actions={
          <Button href={`/api/export/sales${exportQuery}`} variant="primary">
            <FileSpreadsheet aria-hidden="true" />
            Export sales
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Reporting period"
          description="Sales and expense figures below cover this range. The default is the current financial year."
        />
        <FilterBar showSearch={false} dateRange />
      </Card>

      <StatGrid>
        <StatCard
          label="Invoiced"
          value={formatCurrency(sales.invoiced)}
          icon={<Receipt />}
          tone="accent"
          hint={`${sales.invoiceCount} invoices`}
        />
        <StatCard
          label="Received"
          value={formatCurrency(sales.received)}
          icon={<IndianRupee />}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(sales.outstanding)}
          icon={<Wallet />}
          tone={sales.outstanding > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="GST collected"
          value={formatCurrency(sales.taxCollected)}
          tone="neutral"
          hint="CGST + SGST + IGST"
        />
      </StatGrid>

      <Card>
        <CardHeader
          title="Invoiced vs received"
          description="Trailing twelve months"
        />
        <CardBody>
          <LazyRevenueChart data={sales.byMonth} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Sales by customer"
          description="Highest billed first"
        />
        <DataTable
          columns={customerColumns}
          rows={sales.byCustomer}
          rowKey={(row) => row.id}
          rowHref={(row) => `/customers/${row.id}`}
          empty={
            <EmptyState
              title="No sales in this period"
              description="Try widening the date range."
            />
          }
        />
      </Card>

      <Card>
        <CardHeader
          title="Attendance"
          description="Per employee, for the selected month"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker
                month={month}
                year={year}
                basePath="/reports"
                extraParams={{
                  from: param(searchParams, "from"),
                  to: param(searchParams, "to"),
                }}
              />
              <Button
                href={`/api/export/attendance?month=${month}&year=${year}`}
                variant="secondary"
                size="sm"
              >
                <FileSpreadsheet aria-hidden="true" />
                Export
              </Button>
            </div>
          }
        />
        <DataTable
          columns={attendanceColumns}
          rows={attendance}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              title="No attendance recorded"
              description="Nothing has been marked for this month yet."
            />
          }
        />
      </Card>

      <Card>
        <CardHeader
          title="Expenses by category"
          description="Claims raised in the selected period"
        />
        <DataTable
          columns={expenseColumns}
          rows={expenses}
          rowKey={(row) => row.category}
          empty={
            <EmptyState
              title="No expense claims"
              description="Nothing was claimed in this period."
            />
          }
        />
      </Card>
    </>
  );
}
