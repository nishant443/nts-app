import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck,
  ClipboardList,
  ListChecks,
  Receipt,
  Wallet,
} from "lucide-react";

import { CheckInCard } from "@/components/attendance/check-in-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { formatDate, formatDuration, formatMonthYear } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import type { EmployeeDashboard } from "@/lib/services/dashboard";
import { humanizeEnum } from "@/lib/utils";

/**
 * Employee view.
 *
 * Shows only this person's own records plus the invoices they are personally
 * following up. There is no company-wide revenue figure anywhere on this page,
 * and the service that builds it never queries for one.
 */
export function EmployeeDashboardView({ data }: { data: EmployeeDashboard }) {
  return (
    <>
      <CheckInCard
        status={data.todayStatus.status}
        checkInAt={data.todayStatus.checkInAt?.toISOString() ?? null}
        checkOutAt={data.todayStatus.checkOutAt?.toISOString() ?? null}
        workedMinutes={data.todayStatus.workedMinutes}
      />

      <StatGrid>
        <StatCard
          label={`Present in ${data.month.label}`}
          value={data.month.presentDays}
          icon={<CalendarCheck />}
          tone="success"
          href="/attendance"
          hint={
            data.month.halfDays > 0
              ? `+ ${data.month.halfDays} half day(s)`
              : "Full days"
          }
        />
        <StatCard
          label="Hours logged"
          value={formatDuration(data.month.workedMinutes)}
          icon={<ClipboardList />}
          tone="accent"
          href="/work-logs"
          hint={`${data.workLogs.thisMonth} work reports`}
        />
        <StatCard
          label="Expense claims"
          value={formatCurrency(data.expenses.pendingAmount)}
          icon={<Wallet />}
          tone={data.expenses.pendingCount > 0 ? "warning" : "neutral"}
          href="/expenses"
          hint={`${data.expenses.pendingCount} awaiting approval`}
        />
        <StatCard
          label="Latest payslip"
          value={
            data.latestPayslip
              ? formatCurrency(data.latestPayslip.netPay)
              : "—"
          }
          icon={<BadgeIndianRupee />}
          tone="accent"
          href="/payslips"
          hint={
            data.latestPayslip
              ? formatMonthYear(
                  data.latestPayslip.month,
                  data.latestPayslip.year,
                )
              : "Not generated yet"
          }
        />
      </StatGrid>

      {/* Tasks ------------------------------------------------------------ */}
      <Card>
        <CardHeader
          title="Your tasks"
          description={
            data.openTaskCount > 0
              ? `${data.openTaskCount} open`
              : "Nothing assigned right now"
          }
          action={
            <Button href="/tasks" variant="ghost" size="sm">
              All tasks
              <ArrowRight aria-hidden="true" />
            </Button>
          }
        />
        {data.openTasks.length === 0 ? (
          <EmptyState
            title="No open tasks"
            description="When your administrator assigns you work it will appear here."
            icon={<ListChecks />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.openTasks.map((task) => (
              <li key={task.id}>
                <a
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-fg">
                      {task.title}
                    </p>
                    <p
                      className={
                        task.overdue
                          ? "truncate text-[12px] font-medium text-danger"
                          : "truncate text-[12px] text-fg-muted"
                      }
                    >
                      {task.dueDate
                        ? `${task.overdue ? "Overdue — was due" : "Due"} ${formatDate(task.dueDate)}`
                        : "No due date"}
                      {task.customer ? ` · ${task.customer}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={task.priority} dot={false} />
                    <StatusBadge status={task.status} dot={false} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Leave ---------------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Leave balance"
            description={
              data.pendingLeaveCount > 0
                ? `${data.pendingLeaveCount} request(s) awaiting approval`
                : "No pending requests"
            }
            action={
              <Button href="/leave/new" variant="secondary" size="sm">
                Request leave
              </Button>
            }
          />
          {data.leaveBalances.length === 0 ? (
            <EmptyState
              title="No leave allocated yet"
              description="Your administrator has not set your entitlement for this year."
            />
          ) : (
            <CardBody className="flex flex-col gap-3.5">
              {data.leaveBalances.map((balance) => {
                const remaining = Math.max(0, balance.allocated - balance.used);
                const percent =
                  balance.allocated > 0
                    ? (balance.used / balance.allocated) * 100
                    : 0;

                return (
                  <div key={balance.type} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-fg">
                        {humanizeEnum(balance.type)}
                      </span>
                      <span className="tnum text-[12.5px] text-fg-muted">
                        <span className="font-semibold text-fg">
                          {remaining}
                        </span>{" "}
                        of {balance.allocated} left
                      </span>
                    </div>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                      <span
                        className="block h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                  </div>
                );
              })}
            </CardBody>
          )}
        </Card>

        {/* Recent work ---------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Recent work reports"
            description={
              data.workLogs.awaitingReview > 0
                ? `${data.workLogs.awaitingReview} awaiting review`
                : "All reviewed"
            }
            action={
              <Button href="/work-logs/new" variant="secondary" size="sm">
                Log work
              </Button>
            }
          />
          {data.recentWork.length === 0 ? (
            <EmptyState
              title="No work logged yet"
              description="Record what you worked on today so it can be reviewed and billed."
              icon={<ClipboardList />}
              action={{ label: "Log today's work", href: "/work-logs/new" }}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentWork.map((log) => (
                <li key={log.id}>
                  <a
                    href={`/work-logs/${log.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-fg">
                        {log.title}
                      </p>
                      <p className="truncate text-[12px] text-fg-muted">
                        {formatDate(log.date)}
                        {log.customer ? ` · ${log.customer}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={log.status} dot={false} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Follow-ups -------------------------------------------------------- */}
      <Card>
        <CardHeader
          title="Payments to follow up"
          description="Invoices you raised or that belong to your customers"
          action={
            <Button href="/payments" variant="ghost" size="sm">
              All payments
              <ArrowRight aria-hidden="true" />
            </Button>
          }
        />
        {data.followUps.length === 0 ? (
          <EmptyState
            title="Nothing to chase"
            description="None of your customers have an outstanding balance."
            icon={<Receipt />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.followUps.map((invoice) => (
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
                      {invoice.number}
                      {invoice.dueDate
                        ? ` · due ${formatDate(invoice.dueDate)}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-[13.5px] font-semibold text-fg">
                      {formatCurrency(invoice.balance)}
                    </p>
                    {invoice.overdue && (
                      <StatusBadge status="OVERDUE" dot={false} />
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
