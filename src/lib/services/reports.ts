import "server-only";

import {
  financialYearRange,
  monthRange,
  recentMonths,
  today,
} from "@/lib/dates";
import { round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const REVENUE_STATUSES = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

export interface SalesReport {
  from: Date;
  to: Date;
  invoiced: number;
  received: number;
  outstanding: number;
  taxCollected: number;
  invoiceCount: number;
  byMonth: { label: string; invoiced: number; received: number }[];
  byCustomer: {
    id: string;
    customer: string;
    invoiced: number;
    received: number;
    outstanding: number;
    invoiceCount: number;
  }[];
}

export async function getSalesReport(
  from: Date,
  to: Date,
): Promise<SalesReport> {
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: { in: [...REVENUE_STATUSES] },
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        date: true,
        total: true,
        amountPaid: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        customerId: true,
        customer: { select: { name: true, companyName: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: "RECEIVED", date: { gte: from, lte: to } },
      select: { date: true, amount: true, customerId: true },
    }),
  ]);

  let invoiced = 0;
  let taxCollected = 0;
  let outstanding = 0;

  const byCustomer = new Map<
    string,
    {
      customer: string;
      invoiced: number;
      received: number;
      outstanding: number;
      invoiceCount: number;
    }
  >();

  for (const invoice of invoices) {
    const total = toMoney(invoice.total);
    const paid = toMoney(invoice.amountPaid);
    const balance = Math.max(0, round2(total - paid));

    invoiced += total;
    outstanding += balance;
    taxCollected +=
      toMoney(invoice.cgstAmount) +
      toMoney(invoice.sgstAmount) +
      toMoney(invoice.igstAmount);

    const label =
      invoice.customer.companyName ?? invoice.customer.name ?? "Unknown";
    const entry = byCustomer.get(invoice.customerId) ?? {
      customer: label,
      invoiced: 0,
      received: 0,
      outstanding: 0,
      invoiceCount: 0,
    };

    entry.invoiced = round2(entry.invoiced + total);
    entry.outstanding = round2(entry.outstanding + balance);
    entry.invoiceCount += 1;
    byCustomer.set(invoice.customerId, entry);
  }

  let received = 0;
  for (const payment of payments) {
    const amount = toMoney(payment.amount);
    received += amount;

    const entry = byCustomer.get(payment.customerId);
    if (entry) entry.received = round2(entry.received + amount);
  }

  const months = recentMonths(12, to);
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

  return {
    from,
    to,
    invoiced: round2(invoiced),
    received: round2(received),
    outstanding: round2(outstanding),
    taxCollected: round2(taxCollected),
    invoiceCount: invoices.length,
    byMonth: months.map((month) => {
      const k = `${month.year}-${month.month}`;
      return {
        label: month.label,
        invoiced: round2(invoicedBy.get(k) ?? 0),
        received: round2(receivedBy.get(k) ?? 0),
      };
    }),
    byCustomer: [...byCustomer.entries()]
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => b.invoiced - a.invoiced),
  };
}

export interface AttendanceReportRow {
  id: string;
  name: string;
  employeeCode: string;
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  workedMinutes: number;
}

export async function getAttendanceReport(
  month: number,
  year: number,
): Promise<AttendanceReportRow[]> {
  const { from, to } = monthRange(month, year);

  const [employees, grouped, minutes] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    prisma.attendance.groupBy({
      by: ["userId", "status"],
      where: { date: { gte: from, lte: to } },
      _count: true,
    }),
    prisma.attendance.groupBy({
      by: ["userId"],
      where: { date: { gte: from, lte: to } },
      _sum: { workedMinutes: true },
    }),
  ]);

  const counts = new Map<string, Record<string, number>>();
  for (const row of grouped) {
    const entry = counts.get(row.userId) ?? {};
    entry[row.status] = row._count;
    counts.set(row.userId, entry);
  }

  const minutesBy = new Map(
    minutes.map((row) => [row.userId, row._sum.workedMinutes ?? 0]),
  );

  return employees.map((employee) => {
    const entry = counts.get(employee.id) ?? {};
    return {
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
      present: entry.PRESENT ?? 0,
      halfDay: entry.HALF_DAY ?? 0,
      absent: entry.ABSENT ?? 0,
      onLeave: entry.ON_LEAVE ?? 0,
      workedMinutes: minutesBy.get(employee.id) ?? 0,
    };
  });
}

export interface ExpenseReportRow {
  category: string;
  count: number;
  pending: number;
  approved: number;
  total: number;
}

export async function getExpenseReport(
  from: Date,
  to: Date,
): Promise<ExpenseReportRow[]> {
  const items = await prisma.expenseItem.findMany({
    where: { expense: { date: { gte: from, lte: to } } },
    select: {
      category: true,
      amount: true,
      expense: { select: { status: true } },
    },
  });

  const byCategory = new Map<string, ExpenseReportRow>();

  for (const item of items) {
    const entry = byCategory.get(item.category) ?? {
      category: item.category,
      count: 0,
      pending: 0,
      approved: 0,
      total: 0,
    };

    const amount = toMoney(item.amount);
    const status = item.expense.status;
    entry.count += 1;
    entry.total = round2(entry.total + amount);

    if (status === "PENDING") {
      entry.pending = round2(entry.pending + amount);
    } else if (status === "APPROVED" || status === "REIMBURSED") {
      entry.approved = round2(entry.approved + amount);
    }

    byCategory.set(item.category, entry);
  }

  return [...byCategory.values()].sort((a, b) => b.total - a.total);
}

export function defaultReportRange() {
  return financialYearRange(today());
}
