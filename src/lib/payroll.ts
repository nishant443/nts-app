import "server-only";

import type { LeaveType } from "@/generated/prisma/enums";
import { daysInMonth, isWeekOff, monthRange } from "@/lib/dates";
import { round2, toMoney } from "@/lib/money";
import {
  computePayslip,
  deriveLopDays,
  monthlyGross,
  type AttendanceSummary,
  type PayslipComputation,
  type SalaryComponents,
} from "@/lib/payroll-math";
import { prisma } from "@/lib/prisma";

export type {
  AttendanceSummary,
  PayslipComputation,
  SalaryComponents,
};
export { computePayslip, monthlyGross };

const UNPAID_LEAVE_TYPES: LeaveType[] = ["UNPAID"];

export async function getWorkingDays(
  month: number,
  year: number,
): Promise<number> {
  const { from, to } = monthRange(month, year);

  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: from, lte: to } },
    select: { date: true },
  });

  const holidayKeys = new Set(
    holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
  );

  return daysInMonth(month, year).filter((day) => {
    if (isWeekOff(day)) return false;
    return !holidayKeys.has(day.toISOString().slice(0, 10));
  }).length;
}

export async function getAttendanceSummary(
  userId: string,
  month: number,
  year: number,
  workingDays: number,
): Promise<AttendanceSummary> {
  const { from, to } = monthRange(month, year);

  const [records, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: { type: true, startDate: true, endDate: true, days: true },
    }),
  ]);

  const presentDays = records.reduce((total, record) => {
    if (record.status === "PRESENT") return total + 1;
    if (record.status === "HALF_DAY") return total + 0.5;
    return total;
  }, 0);

  const paidLeaveDays = leaves.reduce((total, leave) => {
    if (UNPAID_LEAVE_TYPES.includes(leave.type)) return total;

    const overlapStart = leave.startDate < from ? from : leave.startDate;
    const overlapEnd = leave.endDate > to ? to : leave.endDate;

    const overlapDays = countWorkingDaysBetween(overlapStart, overlapEnd);
    const requestedDays = toMoney(leave.days);

    return total + Math.min(overlapDays, requestedDays);
  }, 0);

  return {
    workingDays,
    presentDays: round2(presentDays),
    paidLeaveDays: round2(paidLeaveDays),
    lopDays: deriveLopDays({
      workingDays,
      presentDays,
      paidLeaveDays,
    }),
  };
}

function countWorkingDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (!isWeekOff(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export async function getEffectiveSalary(
  userId: string,
  month: number,
  year: number,
): Promise<SalaryComponents | null> {
  const { to } = monthRange(month, year);

  const structure = await prisma.salaryStructure.findFirst({
    where: { userId, effectiveFrom: { lte: to } },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!structure) return null;

  return {
    basic: toMoney(structure.basic),
    hra: toMoney(structure.hra),
    conveyance: toMoney(structure.conveyance),
    medical: toMoney(structure.medical),
    specialAllowance: toMoney(structure.specialAllowance),
    otherAllowance: toMoney(structure.otherAllowance),
    pfDeduction: toMoney(structure.pfDeduction),
    esiDeduction: toMoney(structure.esiDeduction),
    professionalTax: toMoney(structure.professionalTax),
    tdsDeduction: toMoney(structure.tdsDeduction),
    otherDeduction: toMoney(structure.otherDeduction),
  };
}

export async function getReimbursableExpenses(
  userId: string,
  month: number,
  year: number,
): Promise<number> {
  const { from, to } = monthRange(month, year);

  const result = await prisma.expense.aggregate({
    where: { userId, status: "APPROVED", date: { gte: from, lte: to } },
    _sum: { amount: true },
  });

  return toMoney(result._sum.amount);
}

export async function buildPayslipFor(
  userId: string,
  month: number,
  year: number,
  workingDays: number,
): Promise<PayslipComputation | null> {
  const salary = await getEffectiveSalary(userId, month, year);
  if (!salary) return null;

  const [attendance, reimbursements] = await Promise.all([
    getAttendanceSummary(userId, month, year, workingDays),
    getReimbursableExpenses(userId, month, year),
  ]);

  return computePayslip({ salary, attendance, reimbursements });
}
