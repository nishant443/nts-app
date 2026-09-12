/**
 * List-page query helpers.
 *
 * Every list screen takes its state from the URL: `?q=&status=&page=`. That
 * keeps the pages Server Components (no client state, no hydration cost),
 * makes any filtered view shareable, and makes the browser's back button work
 * the way people expect.
 */

/** Next 16 hands `searchParams` to pages as a promise of this shape. */
export type SearchParams = Record<string, string | string[] | undefined>;

/** First value for a key — repeated params collapse to the first. */
export function param(
  searchParams: SearchParams,
  key: string,
): string | undefined {
  const value = searchParams[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

/** Reads a param constrained to a known set, ignoring anything else. */
export function enumParam<T extends string>(
  searchParams: SearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = param(searchParams, key);
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export const DEFAULT_PER_PAGE = 20;

export interface PageWindow {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

/** Clamped so `?page=-4` or `?page=1e9` cannot produce a silly query. */
export function pageWindow(
  searchParams: SearchParams,
  perPage = DEFAULT_PER_PAGE,
): PageWindow {
  const raw = Number(param(searchParams, "page") ?? "1");
  const page = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

/**
 * Case-insensitive "contains" across several columns — the standard search
 * behaviour for list pages.
 */
export function searchFilter<T extends string>(
  term: string | undefined,
  fields: readonly T[],
): { OR: Record<string, { contains: string; mode: "insensitive" }>[] } | undefined {
  if (!term) return undefined;

  return {
    OR: fields.map((field) => ({
      [field]: { contains: term, mode: "insensitive" as const },
    })),
  };
}

/** A date range from `?from=&to=` — either bound may be omitted. */
export function dateRangeFilter(
  searchParams: SearchParams,
): { gte?: Date; lte?: Date } | undefined {
  const from = param(searchParams, "from");
  const to = param(searchParams, "to");

  const range: { gte?: Date; lte?: Date } = {};

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    range.gte = new Date(`${from}T00:00:00.000Z`);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    range.lte = new Date(`${to}T23:59:59.999Z`);
  }

  return range.gte || range.lte ? range : undefined;
}

/** Current filter values, for handing back to `<Pagination baseParams>`. */
export function carryParams(
  searchParams: SearchParams,
  keys: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(
    keys.map((key) => [key, param(searchParams, key)]),
  );
}
