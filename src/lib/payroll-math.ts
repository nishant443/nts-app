import { round2 } from "@/lib/money";

/**
 * Payroll calculation — pure functions, no database access.
 *
 * Split out from `lib/payroll.ts` (which is server-only and does the querying)
 * so the arithmetic can be exercised on its own and reused by the UI to preview
 * a payslip before a run is finalised.
 *
 * Method used by NTS:
 *   • Working days  = calendar days − Sundays − declared holidays.
 *   • Paid days     = attendance marked PRESENT (1) or HALF_DAY (0.5), plus
 *                     approved leave taken from a paid leave type.
 *   • LOP days      = working days − paid days (never below zero).
 *   • Per-day rate  = gross monthly earnings ÷ working days.
 *   • Net pay       = gross + approved reimbursements − statutory deductions
 *                     − loss-of-pay deduction.
 */

export interface SalaryComponents {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowance: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  tdsDeduction: number;
  otherDeduction: number;
}

export interface AttendanceSummary {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
}

export interface PayslipComputation extends SalaryComponents, AttendanceSummary {
  reimbursements: number;
  lopDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
}

/** Full-month earnings before any attendance adjustment. */
export function monthlyGross(salary: SalaryComponents): number {
  return round2(
    salary.basic +
      salary.hra +
      salary.conveyance +
      salary.medical +
      salary.specialAllowance +
      salary.otherAllowance,
  );
}

export function computePayslip(input: {
  salary: SalaryComponents;
  attendance: AttendanceSummary;
  reimbursements: number;
}): PayslipComputation {
  const { salary, attendance } = input;

  const fullMonthEarnings = monthlyGross(salary);

  // Guard against a zero divisor for a month with no working days at all.
  const perDayRate =
    attendance.workingDays > 0 ? fullMonthEarnings / attendance.workingDays : 0;

  const lopDeduction = round2(perDayRate * attendance.lopDays);
  const reimbursements = round2(input.reimbursements);

  // Reimbursements are a pass-through of money the employee already spent, so
  // they are added to gross but never scaled by attendance.
  const grossEarnings = round2(fullMonthEarnings + reimbursements);

  const totalDeductions = round2(
    salary.pfDeduction +
      salary.esiDeduction +
      salary.professionalTax +
      salary.tdsDeduction +
      salary.otherDeduction +
      lopDeduction,
  );

  return {
    ...salary,
    ...attendance,
    reimbursements,
    lopDeduction,
    grossEarnings,
    totalDeductions,
    netPay: round2(grossEarnings - totalDeductions),
  };
}

/** Paid days, and the loss-of-pay days that follow from them. */
export function deriveLopDays(options: {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
}): number {
  const paidDays = options.presentDays + options.paidLeaveDays;
  return Math.max(0, round2(options.workingDays - paidDays));
}
