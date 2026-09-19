import { round2 } from "@/lib/money";

export interface TaxLineInput {
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface ComputedLine extends TaxLineInput {
  lineTotal: number;
}

export interface TaxTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
  breakdown: TaxSlab[];
}

export interface TaxSlab {
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export function lineTotal(line: TaxLineInput): number {
  return round2(line.quantity * line.unitPrice);
}

function sameState(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isIntraState(
  placeOfSupply: string | null | undefined,
  homeState: string,
): boolean {
  if (!placeOfSupply) return true;
  return sameState(placeOfSupply, homeState);
}

export function computeTotals(options: {
  lines: TaxLineInput[];
  discountAmount?: number;
  placeOfSupply?: string | null;
  homeState: string;
}): TaxTotals {
  const lines = options.lines.map((line) => ({
    ...line,
    lineTotal: lineTotal(line),
  }));

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const discountAmount = round2(
    Math.min(Math.max(options.discountAmount ?? 0, 0), subtotal),
  );

  const taxableAmount = round2(subtotal - discountAmount);
  const intraState = isIntraState(options.placeOfSupply, options.homeState);

  const slabs = new Map<number, { taxable: number }>();

  for (const line of lines) {
    const share = subtotal > 0 ? line.lineTotal / subtotal : 0;
    const lineTaxable = line.lineTotal - discountAmount * share;

    const slab = slabs.get(line.taxRate) ?? { taxable: 0 };
    slab.taxable += lineTaxable;
    slabs.set(line.taxRate, slab);
  }

  const breakdown: TaxSlab[] = [];
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const [taxRate, slab] of [...slabs.entries()].sort((a, b) => a[0] - b[0])) {
    const slabTaxable = round2(slab.taxable);
    const slabTax = round2((slabTaxable * taxRate) / 100);

    const half = round2(slabTax / 2);

    const entry: TaxSlab = {
      taxRate,
      taxableAmount: slabTaxable,
      cgstAmount: intraState ? half : 0,
      sgstAmount: intraState ? round2(slabTax - half) : 0,
      igstAmount: intraState ? 0 : slabTax,
    };

    cgstAmount += entry.cgstAmount;
    sgstAmount += entry.sgstAmount;
    igstAmount += entry.igstAmount;

    breakdown.push(entry);
  }

  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);

  const total = round2(taxableAmount + cgstAmount + sgstAmount + igstAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total,
    breakdown,
  };
}

export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value.toUpperCase());
}

export function isValidPan(value: string): boolean {
  return PAN_PATTERN.test(value.toUpperCase());
}

export function panFromGstin(gstin: string): string | null {
  if (!isValidGstin(gstin)) return null;
  return gstin.toUpperCase().slice(2, 12);
}

const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export function stateFromGstin(gstin: string): string | null {
  return GST_STATE_CODES[gstin.slice(0, 2)] ?? null;
}

export const INDIAN_STATES = Object.values(GST_STATE_CODES).sort();

export function stateCode(stateName: string | null | undefined): string | null {
  if (!stateName) return null;
  const match = Object.entries(GST_STATE_CODES).find(
    ([, name]) => name.toLowerCase() === stateName.toLowerCase(),
  );
  return match ? match[0] : null;
}
