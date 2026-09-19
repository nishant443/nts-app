export type SearchParams = Record<string, string | string[] | undefined>;

export function param(
  searchParams: SearchParams,
  key: string,
): string | undefined {
  const value = searchParams[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

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

export function pageWindow(
  searchParams: SearchParams,
  perPage = DEFAULT_PER_PAGE,
): PageWindow {
  const raw = Number(param(searchParams, "page") ?? "1");
  const page = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

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

export function carryParams(
  searchParams: SearchParams,
  keys: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(
    keys.map((key) => [key, param(searchParams, key)]),
  );
}
