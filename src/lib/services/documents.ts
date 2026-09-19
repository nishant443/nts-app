import "server-only";

import { parseDateInput } from "@/lib/dates";
import { round2 } from "@/lib/money";
import type { CompanyProfile } from "@/lib/settings";
import { computeTotals, lineTotal } from "@/lib/tax";
import type { LineItemInput } from "@/lib/validation";

export interface PreparedDocument {
  date: Date;
  placeOfSupply: string | null;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
  items: {
    position: number;
    description: string;
    hsnCode: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }[];
}

export function prepareDocument(input: {
  date: string;
  placeOfSupply?: string;
  discountAmount?: number;
  items: LineItemInput[];
  settings: CompanyProfile;
  customerState?: string | null;
}): PreparedDocument {
  const placeOfSupply =
    input.placeOfSupply?.trim() || input.customerState?.trim() || null;

  const totals = computeTotals({
    lines: input.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    })),
    discountAmount: input.discountAmount ?? 0,
    placeOfSupply,
    homeState: input.settings.homeState,
  });

  return {
    date: parseDateInput(input.date),
    placeOfSupply,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxableAmount: totals.taxableAmount,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    igstAmount: totals.igstAmount,
    total: totals.total,
    items: input.items.map((item, index) => ({
      position: index,
      description: item.description,
      hsnCode: item.hsnCode ?? null,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      lineTotal: lineTotal(item),
    })),
  };
}

export function deriveInvoiceStatus(options: {
  current: string;
  total: number;
  amountPaid: number;
  dueDate: Date | null;
  now: Date;
}): string {
  if (options.current === "DRAFT" || options.current === "CANCELLED") {
    return options.current;
  }

  const balance = round2(options.total - options.amountPaid);

  if (balance <= 0.009) return "PAID";
  if (options.amountPaid > 0.009) {
    return options.dueDate && options.dueDate < options.now
      ? "OVERDUE"
      : "PARTIALLY_PAID";
  }

  return options.dueDate && options.dueDate < options.now ? "OVERDUE" : "SENT";
}
