/**
 * Calculation checks for the business rules that carry real money.
 *
 * These are the parts where a quiet arithmetic error would be expensive and
 * hard to spot: GST splitting, discount apportionment, loss-of-pay, amount in
 * words, financial-year numbering, and the line-item form encoding.
 *
 * Run with `npm run check`. No database or server needed — every function
 * under test is pure.
 */

import assert from "node:assert/strict";

import { amountInWords, round2, sumMoney, toMoney } from "../src/lib/money";
import { computeTotals, isIntraState, panFromGstin, stateFromGstin } from "../src/lib/tax";
import { computePayslip, deriveLopDays } from "../src/lib/payroll-math";
import { financialYearLabel, isWeekOff, parseDateInput } from "../src/lib/dates";
import { withLineItems, zipLineItems } from "../src/lib/line-items";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${(error as Error).message.split("\n")[0]}`);
  }
}

function group(title: string) {
  console.log(`\n${title}`);
}

// --- GST ---------------------------------------------------------------------

group("GST");

check("intra-state supply splits into equal CGST and SGST", () => {
  const totals = computeTotals({
    lines: [{ quantity: 1, unitPrice: 10000, taxRate: 18 }],
    placeOfSupply: "Karnataka",
    homeState: "Karnataka",
  });

  assert.equal(totals.taxableAmount, 10000);
  assert.equal(totals.cgstAmount, 900);
  assert.equal(totals.sgstAmount, 900);
  assert.equal(totals.igstAmount, 0);
  assert.equal(totals.total, 11800);
});

check("inter-state supply charges IGST only", () => {
  const totals = computeTotals({
    lines: [{ quantity: 1, unitPrice: 10000, taxRate: 18 }],
    placeOfSupply: "Maharashtra",
    homeState: "Karnataka",
  });

  assert.equal(totals.cgstAmount, 0);
  assert.equal(totals.sgstAmount, 0);
  assert.equal(totals.igstAmount, 1800);
  assert.equal(totals.total, 11800);
});

check("CGST + SGST always equals the full tax, even on odd amounts", () => {
  // 18% of 1234.55 is 222.219, which halves to a third decimal place.
  const totals = computeTotals({
    lines: [{ quantity: 1, unitPrice: 1234.55, taxRate: 18 }],
    placeOfSupply: "Karnataka",
    homeState: "Karnataka",
  });

  const tax = round2(totals.cgstAmount + totals.sgstAmount);
  assert.equal(tax, round2((totals.taxableAmount * 18) / 100));
  assert.equal(
    totals.total,
    round2(totals.taxableAmount + totals.cgstAmount + totals.sgstAmount),
  );
});

check("mixed tax slabs are grouped and reported separately", () => {
  const totals = computeTotals({
    lines: [
      { quantity: 1, unitPrice: 10000, taxRate: 18 },
      { quantity: 2, unitPrice: 1000, taxRate: 12 },
      { quantity: 1, unitPrice: 500, taxRate: 18 },
    ],
    placeOfSupply: "Karnataka",
    homeState: "Karnataka",
  });

  assert.equal(totals.breakdown.length, 2);

  const twelve = totals.breakdown.find((slab) => slab.taxRate === 12)!;
  const eighteen = totals.breakdown.find((slab) => slab.taxRate === 18)!;

  assert.equal(twelve.taxableAmount, 2000);
  assert.equal(eighteen.taxableAmount, 10500);
  assert.equal(totals.subtotal, 12500);
});

check("a document discount is apportioned across lines by value", () => {
  const totals = computeTotals({
    lines: [
      { quantity: 1, unitPrice: 9000, taxRate: 18 },
      { quantity: 1, unitPrice: 1000, taxRate: 5 },
    ],
    discountAmount: 1000,
    placeOfSupply: "Karnataka",
    homeState: "Karnataka",
  });

  assert.equal(totals.subtotal, 10000);
  assert.equal(totals.discountAmount, 1000);
  assert.equal(totals.taxableAmount, 9000);

  // 90% of the discount lands on the 18% line, 10% on the 5% line.
  const eighteen = totals.breakdown.find((slab) => slab.taxRate === 18)!;
  const five = totals.breakdown.find((slab) => slab.taxRate === 5)!;

  assert.equal(eighteen.taxableAmount, 8100);
  assert.equal(five.taxableAmount, 900);
});

check("a discount cannot exceed the goods value", () => {
  const totals = computeTotals({
    lines: [{ quantity: 1, unitPrice: 500, taxRate: 18 }],
    discountAmount: 9999,
    homeState: "Karnataka",
  });

  assert.equal(totals.discountAmount, 500);
  assert.equal(totals.taxableAmount, 0);
  assert.equal(totals.total, 0);
});

check("an unknown place of supply is treated as intra-state", () => {
  assert.equal(isIntraState(null, "Karnataka"), true);
  assert.equal(isIntraState("  karnataka ", "Karnataka"), true);
  assert.equal(isIntraState("Gujarat", "Karnataka"), false);
});

check("GSTIN yields the embedded PAN and state", () => {
  assert.equal(panFromGstin("29BRMPS5212E2ZK"), "BRMPS5212E");
  assert.equal(stateFromGstin("29BRMPS5212E2ZK"), "Karnataka");
  assert.equal(stateFromGstin("27AABCY1234M1Z8"), "Maharashtra");
  assert.equal(panFromGstin("not-a-gstin"), null);
});

// --- Money -------------------------------------------------------------------

group("Money");

check("amount in words uses the Indian numbering system", () => {
  assert.equal(amountInWords(0), "Zero Rupees Only");
  assert.equal(amountInWords(1), "One Rupee Only");
  assert.equal(
    amountInWords(1234.5),
    "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only",
  );
  assert.equal(amountInWords(100000), "One Lakh Rupees Only");
  assert.equal(amountInWords(10000000), "One Crore Rupees Only");
  assert.equal(
    amountInWords(11800),
    "Eleven Thousand Eight Hundred Rupees Only",
  );
});

check("decimal-ish values convert without floating point drift", () => {
  assert.equal(toMoney("1234.56"), 1234.56);
  assert.equal(toMoney(null), 0);
  assert.equal(toMoney(undefined), 0);
  assert.equal(toMoney({ toString: () => "99.99" }), 99.99);
  assert.equal(sumMoney(["0.1", "0.2"]), 0.3);
  assert.equal(round2(2.005), 2.01);
});

// --- Payroll -----------------------------------------------------------------

group("Payroll");

const salary = {
  basic: 30000,
  hra: 12000,
  conveyance: 1600,
  medical: 1250,
  specialAllowance: 4500,
  otherAllowance: 0,
  pfDeduction: 1800,
  esiDeduction: 0,
  professionalTax: 200,
  tdsDeduction: 0,
  otherDeduction: 0,
};

check("a full month pays gross minus statutory deductions", () => {
  const result = computePayslip({
    salary,
    attendance: {
      workingDays: 26,
      presentDays: 26,
      paidLeaveDays: 0,
      lopDays: 0,
    },
    reimbursements: 0,
  });

  assert.equal(result.grossEarnings, 49350);
  assert.equal(result.lopDeduction, 0);
  assert.equal(result.totalDeductions, 2000);
  assert.equal(result.netPay, 47350);
});

check("loss of pay is charged at the per-day rate", () => {
  const result = computePayslip({
    salary,
    attendance: {
      workingDays: 26,
      presentDays: 24,
      paidLeaveDays: 0,
      lopDays: 2,
    },
    reimbursements: 0,
  });

  // 49350 / 26 = 1898.0769… per day; two days rounds to 3796.15.
  assert.equal(result.lopDeduction, 3796.15);
  assert.equal(result.netPay, round2(49350 - 2000 - 3796.15));
});

check("reimbursements are added to gross but never scaled by attendance", () => {
  const withoutClaim = computePayslip({
    salary,
    attendance: { workingDays: 26, presentDays: 25, paidLeaveDays: 0, lopDays: 1 },
    reimbursements: 0,
  });

  const withClaim = computePayslip({
    salary,
    attendance: { workingDays: 26, presentDays: 25, paidLeaveDays: 0, lopDays: 1 },
    reimbursements: 2500,
  });

  assert.equal(withClaim.lopDeduction, withoutClaim.lopDeduction);
  assert.equal(withClaim.netPay, round2(withoutClaim.netPay + 2500));
});

check("approved leave is paid, so it creates no loss of pay", () => {
  const lop = deriveLopDays({
    workingDays: 26,
    presentDays: 23,
    paidLeaveDays: 3,
  });
  assert.equal(lop, 0);
});

check("half days count as half a paid day", () => {
  // 24 full days + 2 half days = 25 paid days out of 26.
  const lop = deriveLopDays({
    workingDays: 26,
    presentDays: 24 + 2 * 0.5,
    paidLeaveDays: 0,
  });
  assert.equal(lop, 1);
});

check("a month with no working days cannot divide by zero", () => {
  const result = computePayslip({
    salary,
    attendance: { workingDays: 0, presentDays: 0, paidLeaveDays: 0, lopDays: 0 },
    reimbursements: 0,
  });

  assert.equal(result.lopDeduction, 0);
  assert.ok(Number.isFinite(result.netPay));
});

// --- Dates -------------------------------------------------------------------

group("Dates");

check("the financial year runs April to March", () => {
  assert.equal(financialYearLabel(parseDateInput("2026-09-11")), "26-27");
  assert.equal(financialYearLabel(parseDateInput("2026-04-01")), "26-27");
  assert.equal(financialYearLabel(parseDateInput("2026-03-31")), "25-26");
  assert.equal(financialYearLabel(parseDateInput("2027-01-15")), "26-27");
});

check("dates parse at UTC midnight regardless of the server timezone", () => {
  const date = parseDateInput("2026-09-11");
  assert.equal(date.toISOString(), "2026-09-11T00:00:00.000Z");
});

check("Sunday is the weekly off", () => {
  // 2026-09-13 is a Sunday; 2026-09-12 a Saturday (a working day at NTS).
  assert.equal(isWeekOff(parseDateInput("2026-09-13")), true);
  assert.equal(isWeekOff(parseDateInput("2026-09-12")), false);
});

// --- Line item form encoding -------------------------------------------------

group("Line items");

check("parallel form arrays zip back into rows", () => {
  const rows = zipLineItems({
    "item.description": ["Spindle rebuild", "Ball screw"],
    "item.quantity": ["1", "2"],
    "item.unit": ["Job", "Nos"],
    "item.unitPrice": ["78000", "18600"],
    "item.taxRate": ["18", "18"],
    "item.hsnCode": ["998717", "848299"],
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.description, "Spindle rebuild");
  assert.equal(rows[1]!.unitPrice, "18600");
});

check("a single row arrives as a bare string, not an array", () => {
  const rows = zipLineItems({
    "item.description": "Preventive maintenance",
    "item.quantity": "1",
    "item.unit": "Visit",
    "item.unitPrice": "12500",
    "item.taxRate": "18",
    "item.hsnCode": "998717",
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.description, "Preventive maintenance");
});

check("blank trailing rows are dropped rather than failing validation", () => {
  const rows = zipLineItems({
    "item.description": ["Real line", ""],
    "item.quantity": ["1", "1"],
    "item.unit": ["Job", "Nos"],
    "item.unitPrice": ["1000", ""],
    "item.taxRate": ["18", "18"],
    "item.hsnCode": ["", ""],
  });

  assert.equal(rows.length, 1);
});

check("withLineItems replaces the flat keys with an items array", () => {
  const result = withLineItems({
    customerId: "abc",
    date: "2026-09-11",
    "item.description": "Spindle rebuild",
    "item.quantity": "1",
    "item.unit": "Job",
    "item.unitPrice": "78000",
    "item.taxRate": "18",
    "item.hsnCode": "998717",
  });

  assert.equal(result.customerId, "abc");
  assert.ok(Array.isArray(result.items));
  assert.equal((result.items as unknown[]).length, 1);
  assert.ok(!("item.description" in result));
});

// --- Result ------------------------------------------------------------------

console.log(
  `\n${failed === 0 ? "✓" : "✗"} ${passed} passed, ${failed} failed\n`,
);

process.exit(failed === 0 ? 0 : 1);
