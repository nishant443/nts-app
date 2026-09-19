export type DecimalLike =
  | number
  | string
  | { toString(): string }
  | null
  | undefined;

export function toMoney(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(typeof value === "string" ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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

export function formatCurrency(value: DecimalLike): string {
  return inrFormatter.format(toMoney(value));
}

export function formatCurrencyCompact(value: DecimalLike): string {
  return inrCompactFormatter.format(toMoney(value));
}

export function formatAmount(value: DecimalLike): string {
  return plainFormatter.format(toMoney(value));
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

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
