import "server-only";

import { cache } from "react";

import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "singleton";

/** Plain, client-safe shape — Decimal columns are already numbers. */
export interface CompanyProfile {
  name: string;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  bankHolderName: string | null;
  upiId: string | null;
  invoicesPrefix: string;
  quotationPrefix: string;
  purchaseOrderPrefix: string;
  currency: string;
  defaultTaxRate: number;
  homeState: string;
}

const FALLBACK: CompanyProfile = {
  name: "Nutan Tech Solutions",
  tagline: "Precision Restored, Performance Assured",
  email: null,
  phone: null,
  website: null,
  logoUrl: "/brand/nts-logo.png",
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: "India",
  gstin: null,
  pan: null,
  bankName: null,
  bankAccountNo: null,
  bankIfsc: null,
  bankBranch: null,
  bankHolderName: null,
  upiId: null,
  invoicesPrefix: "NTS/INV/",
  quotationPrefix: "NTS/QT/",
  purchaseOrderPrefix: "NTS/PO/",
  currency: "INR",
  defaultTaxRate: 18,
  homeState: "Karnataka",
};

/**
 * Company profile, memoised per render pass. Falls back to sane defaults when
 * the settings row has not been seeded yet so a fresh database still renders.
 */
export const getCompanySettings = cache(async (): Promise<CompanyProfile> => {
  const row = await prisma.companySettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!row) return FALLBACK;

  return {
    ...row,
    defaultTaxRate: toMoney(row.defaultTaxRate),
  };
});

/** Single-line postal address, for PDF headers and the customer card. */
export function formatAddress(
  parts: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  },
  separator = ", ",
): string {
  return [
    parts.addressLine1,
    parts.addressLine2,
    parts.city,
    [parts.state, parts.postalCode].filter(Boolean).join(" - "),
    parts.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(separator);
}
