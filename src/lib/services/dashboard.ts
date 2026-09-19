import "server-only";

import {
  financialYearRange,
  monthRange,
  recentMonths,
  today,
} from "@/lib/dates";
import type { SessionUser } from "@/lib/dal";
import { round2, toMoney } from "@/lib/money";
import type { CheckInGate } from "@/lib/attendance-rules";
import { prisma } from "@/lib/prisma";
import { getCheckInGate } from "@/lib/services/check-in";

const REVENUE_STATUSES = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

export interface AdminDashboard {
  financialYear: { from: Date; to: Date };
  totalSales: number;
  totalReceived: number;
  outstanding: number;
  priorOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  monthSales: number;
  previousMonthSales: number;
  salesTrendPercent: number;
  activeEmployees: number;
  pendingLeaveCount: number;
  pendingWorkLogCount: number;
  pendingExpenseCount: number;
  pendingExpenseAmount: number;
  openQuotationCount: number;
  openQuotationValue: number;
  attendanceToday: {
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    notMarked: number;
  };
  revenueByMonth: { label: string; invoiced: number; received: number }[];
  recentInvoices: {
    id: string;
    number: string;
    customer: string;
    total: number;
    balance: number;
    status: string;
    date: Date;
  }[];
  topOutstanding: {
    id: string;
    customer: string;
    balance: number;
    invoiceCount: number;
  }[];
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const now = today();
  const fy = financialYearRange(now);
  const thisMonth = monthRange(now.getUTCMonth() + 1, now.getUTCFullYear());

  const previous = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const lastMonth = monthRange(
    previous.getUTCMonth() + 1,
    previous.getUTCFullYear(),
  );

  const revenueWhere = { status: { in: [...REVENUE_STATUSES] } };

  const [
    salesAggregate,
    outstandingInvoices,
    monthSalesAggregate,
    previousMonthAggregate,
    activeEmployees,
    pendingLeaveCount,
    pendingWorkLogCount,
    pendingExpenses,
    openQuotations,
    attendanceRows,
    recentInvoiceRows,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...revenueWhere, date: { gte: fy.from, lte: fy.to } },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.invoice.findMany({
      where: revenueWhere,
      select: {
        id: true,
        total: true,
        amountPaid: true,
        dueDate: true,
        customerId: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        ...revenueWhere,
        date: { gte: thisMonth.from, lte: thisMonth.to },
      },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...revenueWhere,
        date: { gte: lastMonth.from, lte: lastMonth.to },
      },
      _sum: { total: true },
    }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.dailyWorkLog.count({ where: { status: "SUBMITTED" } }),
    prisma.expense.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.quotation.aggregate({
      where: { status: { in: ["DRAFT", "SENT"] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: now },
      _count: true,
    }),
    prisma.invoice.findMany({
      where: revenueWhere,
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true,
        number: true,
        total: true,
        amountPaid: true,
        status: true,
        date: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
  ]);

  let allTimeOutstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  const byCustomer = new Map<
    string,
    { customer: string; balance: number; invoiceCount: number }
  >();

  for (const invoice of outstandingInvoices) {
    const balance = round2(
      toMoney(invoice.total) - toMoney(invoice.amountPaid),
    );
    if (balance <= 0.009) continue;

    allTimeOutstanding += balance;

    if (invoice.dueDate && invoice.dueDate < now) {
      overdueAmount += balance;
      overdueCount += 1;
    }

    const label =
      invoice.customer.companyName ?? invoice.customer.name ?? "Unknown";
    const entry = byCustomer.get(invoice.customerId) ?? {
      customer: label,
      balance: 0,
      invoiceCount: 0,
    };
    entry.balance = round2(entry.balance + balance);
    entry.invoiceCount += 1;
    byCustomer.set(invoice.customerId, entry);
  }

  const monthSales = toMoney(monthSalesAggregate._sum.total);
  const previousMonthSales = toMoney(previousMonthAggregate._sum.total);
  const salesTrendPercent =
    previousMonthSales > 0
      ? ((monthSales - previousMonthSales) / previousMonthSales) * 100
      : 0;

  const attendanceCounts = Object.fromEntries(
    attendanceRows.map((row) => [row.status, row._count]),
  );

  const marked =
    (attendanceCounts.PRESENT ?? 0) +
    (attendanceCounts.HALF_DAY ?? 0) +
    (attendanceCounts.ABSENT ?? 0) +
    (attendanceCounts.ON_LEAVE ?? 0);

  const totalSales = toMoney(salesAggregate._sum.total);
  const totalReceived = toMoney(salesAggregate._sum.amountPaid);
  const outstanding = round2(totalSales - totalReceived);

  return {
    financialYear: fy,
    totalSales,
    totalReceived,
    outstanding,
    priorOutstanding: round2(Math.max(0, allTimeOutstanding - outstanding)),
    overdueAmount: round2(overdueAmount),
    overdueCount,
    monthSales,
    previousMonthSales,
    salesTrendPercent,
    activeEmployees,
    pendingLeaveCount,
    pendingWorkLogCount,
    pendingExpenseCount: pendingExpenses._count,
    pendingExpenseAmount: toMoney(pendingExpenses._sum.amount),
    openQuotationCount: openQuotations._count,
    openQuotationValue: toMoney(openQuotations._sum.total),
    attendanceToday: {
      present: attendanceCounts.PRESENT ?? 0,
      halfDay: attendanceCounts.HALF_DAY ?? 0,
      absent: attendanceCounts.ABSENT ?? 0,
      onLeave: attendanceCounts.ON_LEAVE ?? 0,
      notMarked: Math.max(0, activeEmployees - marked),
    },
    revenueByMonth: await getRevenueByMonth(),
    recentInvoices: recentInvoiceRows.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customer: invoice.customer.companyName ?? invoice.customer.name,
      total: toMoney(invoice.total),
      balance: round2(toMoney(invoice.total) - toMoney(invoice.amountPaid)),
      status: invoice.status,
      date: invoice.date,
    })),
    topOutstanding: [...byCustomer.entries()]
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5),
  };
}

async function getRevenueByMonth() {
  const months = recentMonths(6);
  const first = monthRange(months[0]!.month, months[0]!.year);
  const last = monthRange(
    months[months.length - 1]!.month,
    months[months.length - 1]!.year,
  );

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: { in: [...REVENUE_STATUSES] },
        date: { gte: first.from, lte: last.to },
      },
      select: { date: true, total: true },
    }),
    prisma.payment.findMany({
      where: { status: "RECEIVED", date: { gte: first.from, lte: last.to } },
      select: { date: true, amount: true },
    }),
  ]);

  const key = (date: Date) =>
    `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;

  const invoicedBy = new Map<string, number>();
  for (const invoice of invoices) {
    const k = key(invoice.date);
    invoicedBy.set(k, (invoicedBy.get(k) ?? 0) + toMoney(invoice.total));
  }

  const receivedBy = new Map<string, number>();
  for (const payment of payments) {
    const k = key(payment.date);
    receivedBy.set(k, (receivedBy.get(k) ?? 0) + toMoney(payment.amount));
  }

  return months.map((month) => {
    const k = `${month.year}-${month.month}`;
    return {
      label: month.label,
      invoiced: round2(invoicedBy.get(k) ?? 0),
      received: round2(receivedBy.get(k) ?? 0),
    };
  });
}

export interface EmployeeDashboard {
  todayStatus: {
    status: string | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    workedMinutes: number;
  };
  checkInGate: CheckInGate;
  month: {
    label: string;
    presentDays: number;
    halfDays: number;
    absentDays: number;
    leaveDays: number;
    workedMinutes: number;
  };
  pendingLeaveCount: number;
  leaveBalances: { type: string; allocated: number; used: number }[];
  workLogs: { thisMonth: number; awaitingReview: number };
  expenses: {
    pendingCount: number;
    pendingAmount: number;
    approvedThisMonth: number;
  };
  latestPayslip: {
    id: string;
    month: number;
    year: number;
    netPay: number;
  } | null;
  followUps: {
    id: string;
    number: string;
    customer: string;
    balance: number;
    dueDate: Date | null;
    overdue: boolean;
  }[];
  recentWork: {
    id: string;
    title: string;
    date: Date;
    status: string;
    customer: string | null;
  }[];
  openTasks: {
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: Date | null;
    overdue: boolean;
    customer: string | null;
  }[];
  openTaskCount: number;
}

export async function getEmployeeDashboard(
  user: SessionUser,
): Promise<EmployeeDashboard> {
  const now = today();
  const month = monthRange(now.getUTCMonth() + 1, now.getUTCFullYear());

  const [
    todayRecord,
    monthAttendance,
    pendingLeaveCount,
    balances,
    workLogsThisMonth,
    workLogsAwaiting,
    pendingExpenses,
    approvedExpenses,
    latestPayslip,
    followUpInvoices,
    recentWork,
    openTasks,
    openTaskCount,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: now } },
      select: {
        status: true,
        checkInAt: true,
        checkOutAt: true,
        workedMinutes: true,
      },
    }),
    prisma.attendance.findMany({
      where: { userId: user.id, date: { gte: month.from, lte: month.to } },
      select: { status: true, workedMinutes: true },
    }),
    prisma.leaveRequest.count({
      where: { userId: user.id, status: "PENDING" },
    }),
    prisma.leaveBalance.findMany({
      where: { userId: user.id, year: now.getUTCFullYear() },
      select: { type: true, allocated: true, used: true },
      orderBy: { type: "asc" },
    }),
    prisma.dailyWorkLog.count({
      where: { userId: user.id, date: { gte: month.from, lte: month.to } },
    }),
    prisma.dailyWorkLog.count({
      where: { userId: user.id, status: "SUBMITTED" },
    }),
    prisma.expense.aggregate({
      where: { userId: user.id, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        status: { in: ["APPROVED", "REIMBURSED"] },
        date: { gte: month.from, lte: month.to },
      },
      _sum: { amount: true },
    }),
    prisma.payslip.findFirst({
      where: { userId: user.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true, month: true, year: true, netPay: true },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        OR: [{ createdById: user.id }, { customer: { ownerId: user.id } }],
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true,
        number: true,
        total: true,
        amountPaid: true,
        dueDate: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.dailyWorkLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        date: true,
        status: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [
        { priority: "desc" },
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        dueDate: true,
        customer: { select: { companyName: true, name: true } },
      },
    }),
    prisma.task.count({
      where: { assigneeId: user.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  const summary = monthAttendance.reduce(
    (totals, record) => {
      if (record.status === "PRESENT") totals.presentDays += 1;
      else if (record.status === "HALF_DAY") totals.halfDays += 1;
      else if (record.status === "ABSENT") totals.absentDays += 1;
      else if (record.status === "ON_LEAVE") totals.leaveDays += 1;
      totals.workedMinutes += record.workedMinutes;
      return totals;
    },
    {
      presentDays: 0,
      halfDays: 0,
      absentDays: 0,
      leaveDays: 0,
      workedMinutes: 0,
    },
  );

  return {
    todayStatus: {
      status: todayRecord?.status ?? null,
      checkInAt: todayRecord?.checkInAt ?? null,
      checkOutAt: todayRecord?.checkOutAt ?? null,
      workedMinutes: todayRecord?.workedMinutes ?? 0,
    },
    checkInGate: await getCheckInGate(user.id),
    month: {
      label: now.toLocaleString("en-IN", { month: "long", timeZone: "UTC" }),
      ...summary,
    },
    pendingLeaveCount,
    leaveBalances: balances.map((balance) => ({
      type: balance.type,
      allocated: toMoney(balance.allocated),
      used: toMoney(balance.used),
    })),
    workLogs: {
      thisMonth: workLogsThisMonth,
      awaitingReview: workLogsAwaiting,
    },
    expenses: {
      pendingCount: pendingExpenses._count,
      pendingAmount: toMoney(pendingExpenses._sum.amount),
      approvedThisMonth: toMoney(approvedExpenses._sum.amount),
    },
    latestPayslip: latestPayslip
      ? {
          id: latestPayslip.id,
          month: latestPayslip.month,
          year: latestPayslip.year,
          netPay: toMoney(latestPayslip.netPay),
        }
      : null,
    followUps: followUpInvoices
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        customer: invoice.customer.companyName ?? invoice.customer.name,
        balance: round2(toMoney(invoice.total) - toMoney(invoice.amountPaid)),
        dueDate: invoice.dueDate,
        overdue: Boolean(invoice.dueDate && invoice.dueDate < now),
      }))
      .filter((invoice) => invoice.balance > 0.009),
    recentWork: recentWork.map((log) => ({
      id: log.id,
      title: log.title,
      date: log.date,
      status: log.status,
      customer: log.customer?.companyName ?? log.customer?.name ?? null,
    })),
    openTasks: openTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      overdue: Boolean(task.dueDate && task.dueDate < now),
      customer: task.customer?.companyName ?? task.customer?.name ?? null,
    })),
    openTaskCount,
  };
}
