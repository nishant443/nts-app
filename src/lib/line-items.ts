const LINE_ITEM_FIELDS = [
  "description",
  "hsnCode",
  "quantity",
  "unit",
  "unitPrice",
  "taxRate",
] as const;

type LineItemField = (typeof LINE_ITEM_FIELDS)[number];

export const LINE_ITEM_PREFIX = "item";

function toArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

export function zipLineItems(
  source: Record<string, unknown>,
): Record<LineItemField, string>[] {
  const columns = new Map<LineItemField, string[]>();

  for (const field of LINE_ITEM_FIELDS) {
    columns.set(field, toArray(source[`${LINE_ITEM_PREFIX}.${field}`]));
  }

  const rowCount = Math.max(
    ...LINE_ITEM_FIELDS.map((field) => columns.get(field)!.length),
    0,
  );

  const rows: Record<LineItemField, string>[] = [];

  for (let index = 0; index < rowCount; index++) {
    const row = Object.fromEntries(
      LINE_ITEM_FIELDS.map((field) => [
        field,
        columns.get(field)![index] ?? "",
      ]),
    ) as Record<LineItemField, string>;

    if (!row.description.trim() && !row.unitPrice.trim()) continue;

    rows.push(row);
  }

  return rows;
}

export function withLineItems(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith(`${LINE_ITEM_PREFIX}.`)) continue;
    result[key] = value;
  }

  result.items = zipLineItems(source);
  return result;
}
