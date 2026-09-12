import "server-only";

import { financialYearLabel } from "@/lib/dates";
import type { Prisma } from "@/lib/prisma";

/**
 * Document numbers follow the format NTS already uses on paper:
 *
 *   NTS/26-27/28   invoice 28 of financial year 2026-27
 *
 * The financial year runs April–March, so the counter resets each April.
 *
 * The sequence is derived inside the caller's transaction by reading the
 * highest number already issued for that year. Two concurrent inserts could
 * still pick the same value, so `number` carries a unique constraint and
 * `withDocumentNumber` retries on the resulting conflict.
 */

export type DocumentKind = "invoice" | "quotation" | "purchaseOrder";

type TransactionClient = Prisma.TransactionClient;

function separator(prefix: string) {
  // Settings store prefixes like "NTS/INV/"; keep whatever the user configured.
  return prefix.endsWith("/") ? "" : "/";
}

async function highestSequence(
  tx: TransactionClient,
  kind: DocumentKind,
  prefix: string,
): Promise<number> {
  const where = { number: { startsWith: prefix } };
  const select = { number: true };

  // Ordering by `number` would sort lexicographically ("9" above "10"), so read
  // the year's numbers and take the numeric maximum. One financial year holds a
  // few hundred rows at most.
  const rows =
    kind === "invoice"
      ? await tx.invoice.findMany({ where, select })
      : kind === "quotation"
        ? await tx.quotation.findMany({ where, select })
        : await tx.purchaseOrder.findMany({ where, select });

  return rows.reduce((max, row) => {
    const tail = row.number.slice(prefix.length);
    const value = Number.parseInt(tail, 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
}

/**
 * Next number for `kind`, e.g. "NTS/INV/26-27/29".
 * Must run inside a transaction alongside the insert that consumes it.
 */
export async function nextDocumentNumber(
  tx: TransactionClient,
  kind: DocumentKind,
  date: Date,
  configuredPrefix: string,
): Promise<string> {
  const year = financialYearLabel(date);
  const prefix = `${configuredPrefix}${separator(configuredPrefix)}${year}/`;
  const sequence = (await highestSequence(tx, kind, prefix)) + 1;
  return `${prefix}${sequence}`;
}

/**
 * Runs `operation` with a freshly allocated document number, retrying if a
 * concurrent insert claimed the same one first.
 */
export async function withDocumentNumber<T>(
  tx: TransactionClient,
  kind: DocumentKind,
  date: Date,
  configuredPrefix: string,
  operation: (documentNumber: string) => Promise<T>,
): Promise<T> {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const number = await nextDocumentNumber(tx, kind, date, configuredPrefix);
    try {
      return await operation(number);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1 || !isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Could not allocate a document number.");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Employee codes: NTS-001, NTS-002, … */
export function formatEmployeeCode(sequence: number): string {
  return `NTS-${String(sequence).padStart(3, "0")}`;
}
