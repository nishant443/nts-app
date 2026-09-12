import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  ClipboardCheck,
  FileText,
  IndianRupee,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { LazyRevenueChart } from "@/components/charts/lazy-revenue-chart";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/dates";
import { formatCurrency, formatCurrencyCompact } from "@/lib/money";
import type { AdminDashboard } from "@/lib/services/dashboard";

/**
 * Admin view. Every figure here is company-wide and must never be rendered for
 * an employee — the page that renders this component calls `requireAdmin()`
 * before the data is even fetched.
 */
export function AdminDashboardView({ data }: { data: AdminDashboard }) {
  const collectionRate =
    data.totalSales > 0 ? (data.totalReceived / data.totalSales) * 100 : 0;

  return (
    <>
      <StatGrid>
        <StatCard
          label="Total sales (this FY)"
          value={formatCurrency(data.totalSales)}
          icon={<TrendingUp />}
          tone="accent"
          hint={`Since ${formatDate(data.financialYear.from)}`}
        />
        <StatCard
          label="Payments received"
          value={formatCurrency(data.totalReceived)}
          icon={<IndianRupee />}
          tone="success"
          hint={`${collectionRate.toFixed(0)}% of invoiced`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(data.outstanding)}
          icon={<Wallet />}
          tone={data.outstanding > 0 ? "warning" : "neutral"}
          href="/invoices?status=PARTIALLY_PAID"
          hint="Awaiting collection"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(data.overdueAmount)}
          icon={<AlertTriangle />}
          tone={data.overdueCount > 0 ? "danger" : "neutral"}
          href="/invoices?status=OVERDUE"
          hint={
            data.overdueCount === 1
              ? "1 invoice past due"
              : `${data.overdueCount} invoices past due`
          }
        />
      </StatGrid>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Revenue chart -------------------------------------------------- */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Invoiced vs received"
            description="Last six months"
            action={
              <Badge tone={data.salesTrendPercent >= 0 ? "success" : "danger"}>
                {data.salesTrendPercent >= 0 ? "+" : ""}
                {data.salesTrendPercent.toFixed(1)}% vs last month
              </Badge>
            }
          />
          <CardBody>
            <LazyRevenueChart data={data.revenueByMonth} />
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[12.5px] text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full bg-accent"
                />
                Invoiced
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full bg-success"
                />
                Received
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Today's attendance --------------------------------------------- */}
        <Card>
          <CardHeader
            title="Attendance today"
            description={`${data.activeEmployees} active employees`}
            action={
              <Button href="/admin/attendance" variant="ghost" size="sm">
                Register
                <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
          <CardBody className="flex flex-col gap-2.5">
            <AttendanceRow
              label="Present"
              count={data.attendanceToday.present}
              total={data.activeEmployees}
              tone="bg-success"
            />
            <AttendanceRow
              label="Half day"
              count={data.attendanceToday.halfDay}
              total={data.activeEmployees}
              tone="bg-warning"
            />
            <AttendanceRow
              label="On leave"
              count={data.attendanceToday.onLeave}
              total={data.activeEmployees}
              tone="bg-info"
            />
            <AttendanceRow
              label="Absent"
              count={data.attendanceToday.absent}
              total={data.activeEmployees}
              tone="bg-danger"
            />
            <AttendanceRow
              label="Not marked"
              count={data.attendanceToday.notMarked}
              total={data.activeEmployees}
              tone="bg-steel-400"
            />
          </CardBody>
        </Card>
      </div>

      {/* Things waiting on the admin -------------------------------------- */}
      <StatGrid>
        <StatCard
          label="Leave requests"
          value={data.pendingLeaveCount}
          icon={<ClipboardCheck />}
          tone={data.pendingLeaveCount > 0 ? "warning" : "neutral"}
          href="/admin/approvals?tab=leave"
          hint="Awaiting your decision"
        />
        <StatCard
          label="Work reports"
          value={data.pendingWorkLogCount}
          icon={<FileText />}
          tone={data.pendingWorkLogCount > 0 ? "warning" : "neutral"}
          href="/admin/approvals?tab=work"
          hint="Submitted for review"
        />
        <StatCard
          label="Expense claims"
          value={formatCurrency(data.pendingExpenseAmount)}
          icon={<Wallet />}
          tone={data.pendingExpenseCount > 0 ? "warning" : "neutral"}
          href="/admin/approvals?tab=expenses"
          hint={`${data.pendingExpenseCount} pending`}
        />
        <StatCard
          label="Open quotations"
          value={formatCurrencyCompact(data.openQuotationValue)}
          icon={<BadgeIndianRupee />}
          tone="accent"
          href="/quotations?status=SENT"
          hint={`${data.openQuotationCount} in play`}
        />
      </StatGrid>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent invoices ------------------------------------------------ */}
        <Card>
          <CardHeader
            title="Recent invoices"
            action={
              <Button href="/invoices" variant="ghost" size="sm">
                View all
                <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
          {data.recentInvoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Raise your first invoice to start tracking revenue."
              action={{ label: "New invoice", href: "/invoices/new" }}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <a
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-fg">
                        {invoice.customer}
                      </p>
                      <p className="truncate text-[12px] text-fg-muted">
                        {invoice.number} · {formatDate(invoice.date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[13.5px] font-semibold text-fg">
                        {formatCurrency(invoice.total)}
                      </p>
                      <StatusBadge status={invoice.status} dot={false} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top outstanding ------------------------------------------------ */}
        <Card>
          <CardHeader
            title="Largest balances"
            description="Customers with the most outstanding"
            action={
              <Button href="/payments" variant="ghost" size="sm">
                Payments
                <ArrowRight aria-hidden="true" />
              </Button>
            }
          />
          {data.topOutstanding.length === 0 ? (
            <EmptyState
              title="Everything is collected"
              description="No customer has an outstanding balance right now."
              icon={<IndianRupee />}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.topOutstanding.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`/customers/${entry.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-fg">
                        {entry.customer}
                      </p>
                      <p className="text-[12px] text-fg-muted">
                        {entry.invoiceCount === 1
                          ? "1 open invoice"
                          : `${entry.invoiceCount} open invoices`}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-[13.5px] font-semibold text-warning">
                      {formatCurrency(entry.balance)}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function AttendanceRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12.5px] text-fg-muted">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-inset">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${tone}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="tnum w-6 shrink-0 text-right text-[13px] font-semibold text-fg">
        {count}
      </span>
    </div>
  );
}
