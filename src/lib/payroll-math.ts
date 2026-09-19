import { round2 } from "@/lib/money";

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

  const perDayRate =
    attendance.workingDays > 0 ? fullMonthEarnings / attendance.workingDays : 0;

  const lopDeduction = round2(perDayRate * attendance.lopDays);
  const reimbursements = round2(input.reimbursements);

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

export function deriveLopDays(options: {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
}): number {
  const paidDays = options.presentDays + options.paidLeaveDays;
  return Math.max(0, round2(options.workingDays - paidDays));
}
