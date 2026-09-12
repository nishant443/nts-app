/**
 * Money helpers.
 *
 * Amounts live in Postgres as `Decimal(14,2)`. Prisma hands those back as
 * `Decimal` objects which cannot be serialised across the server/client
 * boundary — every value read from the database must pass through `toMoney()`
 * before it reaches a Client Component or a JSON response.
 *
 * This module is intentionally free of server-only imports so Client
 * Components can use the formatters too.
 */

/** Anything Prisma might hand back for a Decimal column. */
export type DecimalLike =
  | number
  | string
  | { toString(): string }
  | null
  | undefined;

/** Convert a Prisma Decimal (or anything numeric) to a plain number. */
export function toMoney(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(typeof value === "string" ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Round to paise. Floating point sums drift; every total goes through this. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sum a list of decimal-ish values, rounded to paise. */
export function sumMoney(values: DecimalLike[]): number {
  return round2(values.reduce<number>((total, v) => total + toMoney(v), 0));
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "₹1,23,456.00" — Indian digit grouping. */
export function formatCurrency(value: DecimalLike): string {
  return inrFormatter.format(toMoney(value));
}

/** "₹1.2L" — for stat tiles where the exact paise would be noise. */
export function formatCurrencyCompact(value: DecimalLike): string {
  return inrCompactFormatter.format(toMoney(value));
}

/** "1,23,456.00" — no symbol, for table cells that carry their own header. */
export function formatAmount(value: DecimalLike): string {
  return plainFormatter.format(toMoney(value));
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Amount in words, Indian numbering system — required on GST tax invoices.
 * e.g. 1234.50 -> "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only"
 */
export function amountInWords(value: DecimalLike): string {
  const amount = round2(toMoney(value));
  const isNegative = amount < 0;
  const absolute = Math.abs(amount);

  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  const rupeeWords = rupees === 0 ? "Zero" : numberToWords(rupees);
  let result = `${rupeeWords} Rupee${rupees === 1 ? "" : "s"}`;

  if (paise > 0) {
    result += ` and ${numberToWords(paise)} Paise`;
  }

  return `${isNegative ? "Minus " : ""}${result} Only`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens]! + (ones ? ` ${ONES[ones]!}` : "");
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]!} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Indian grouping: crore, lakh, thousand, hundred. */
function numberToWords(n: number): string {
  if (n === 0) return "Zero";

  const parts: string[] = [];

  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;

  if (crore) parts.push(`${numberToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));

  return parts.join(" ");
}
