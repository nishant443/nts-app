/**
 * Line-item form encoding.
 *
 * A repeating table of line items has to survive a plain `FormData` round trip.
 * Each row submits its fields under the same names, so the browser sends
 * parallel arrays:
 *
 *   item.description = ["Spindle rebuild", "Ball screw"]
 *   item.quantity    = ["1", "2"]
 *
 * `zipLineItems` turns those back into objects. A single row arrives as a bare
 * string rather than an array, which is the usual source of bugs here — hence
 * `toArray`.
 */

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

/**
 * Extracts `item.*` parallel arrays from a parsed form object and returns an
 * array of row objects, dropping rows the user left completely blank.
 */
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

    // An untouched trailing row has no description and no rate — skip it
    // rather than failing validation on the user's behalf.
    if (!row.description.trim() && !row.unitPrice.trim()) continue;

    rows.push(row);
  }

  return rows;
}

/**
 * Replaces the flat `item.*` keys with a single `items` array so the Zod
 * document schemas can validate rows as objects.
 */
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
