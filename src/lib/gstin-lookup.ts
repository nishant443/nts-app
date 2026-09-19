import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { isValidGstin, panFromGstin, stateFromGstin } from "@/lib/tax";

export interface GstinDetails {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  status: string | null;
  constitution: string | null;
  registeredOn: string | null;
  pan: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export function isGstinLookupConfigured(): boolean {
  return Boolean(env.GSTIN_API_URL);
}

const TIMEOUT_MS = 10_000;

export async function lookupGstin(raw: string): Promise<GstinDetails> {
  const gstin = raw.trim().toUpperCase();
  if (!isValidGstin(gstin)) {
    throw new AppError("Enter a valid 15-character GSTIN first.", {
      status: 422,
    });
  }
  if (!env.GSTIN_API_URL) {
    throw new AppError(
      "GST lookup is not set up. An administrator needs to add GSTIN_API_URL and GSTIN_API_KEY to the server settings.",
      { status: 503, code: "gstin_lookup_unavailable" },
    );
  }

  const url = env.GSTIN_API_URL.replaceAll("{gstin}", gstin).replaceAll(
    "{key}",
    encodeURIComponent(env.GSTIN_API_KEY ?? ""),
  );
  const headers: Record<string, string> = { accept: "application/json" };
  if (env.GSTIN_API_KEY_HEADER && env.GSTIN_API_KEY) {
    headers[env.GSTIN_API_KEY_HEADER] = env.GSTIN_API_KEY;
  }

  let payload: unknown;
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new AppError(
        `The GST lookup service answered ${response.status}. Try again in a moment, or fill the details by hand.`,
        { status: 502 },
      );
    }
    payload = await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("[gstin] lookup failed", error);
    throw new AppError(
      "Could not reach the GST lookup service. Check the connection and try again, or fill the details by hand.",
      { status: 502 },
    );
  }

  const details = normalise(gstin, payload);
  if (!details) {
    throw new AppError(
      "No registration was found for that GSTIN. Check the number, or fill the details by hand.",
      { status: 404 },
    );
  }
  return details;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== "-" ? trimmed : null;
};

const pick = (source: Json | undefined, ...keys: string[]): string | null => {
  if (!source) return null;
  for (const key of keys) {
    const found = text(source[key]);
    if (found) return found;
  }
  return null;
};

function findTaxpayer(payload: unknown, depth = 0): Json | null {
  if (!isObject(payload) || depth > 3) return null;
  if (pick(payload, "lgnm", "legal-name", "legalName", "legal_name")) {
    return payload;
  }
  for (const key of ["data", "taxpayerInfo", "result", "response", "details"]) {
    const nested = findTaxpayer(payload[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function normalise(gstin: string, payload: unknown): GstinDetails | null {
  if (isObject(payload)) {
    if (payload.flag === false || payload.error === true) {
      const record = findTaxpayer(payload);
      if (!record) return null;
    }
  }

  const record = findTaxpayer(payload);
  if (!record) return null;

  const legalName = pick(
    record,
    "lgnm",
    "legal-name",
    "legalName",
    "legal_name",
  );
  if (!legalName) return null;

  const pradr = isObject(record.pradr) ? record.pradr : undefined;
  const addr = pradr && isObject(pradr.addr) ? pradr.addr : pradr;
  const flat = isObject(record.adress)
    ? record.adress
    : isObject(record.address)
      ? record.address
      : undefined;

  const building = [
    pick(addr, "bno", "building_number"),
    pick(addr, "flno", "floor_number"),
    pick(addr, "bnm", "building_name"),
  ]
    .filter(Boolean)
    .join(", ");
  const street = [pick(addr, "st", "street"), pick(addr, "loc", "locality")]
    .filter(Boolean)
    .join(", ");

  const addressLine1 =
    building || pick(flat, "bno", "bnm", "line1", "address1") || null;
  const addressLine2 =
    street || pick(flat, "st", "loc", "line2", "address2") || null;
  const city =
    pick(addr, "dst", "city", "district") ??
    pick(flat, "dst", "city", "district");
  const postalCode =
    pick(addr, "pncd", "pincode", "pin") ??
    pick(flat, "pncd", "pincode", "pin");
  const state =
    pick(addr, "stcd", "state") ??
    pick(flat, "stcd", "state") ??
    stateFromGstin(gstin);

  return {
    gstin,
    legalName,
    tradeName: pick(
      record,
      "tradeNam",
      "trade-name",
      "tradeName",
      "trade_name",
    ),
    status: pick(record, "sts", "status", "gstin_status"),
    constitution: pick(record, "ctb", "constitution", "business_type"),
    registeredOn: pick(record, "rgdt", "registration_date", "registrationDate"),
    pan: panFromGstin(gstin),
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
  };
}
