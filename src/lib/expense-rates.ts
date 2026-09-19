export const FUEL_RATE_PER_KM = 5;

export const FOOD_ALLOWANCE = {
  LOCAL: 200,
  OUTSTATION: 500,
} as const;

export type FoodType = keyof typeof FOOD_ALLOWANCE;

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  LOCAL: "Local",
  OUTSTATION: "Outstation",
};

export const EXPENSE_CATEGORIES = [
  "FUEL",
  "FOOD",
  "TRAVEL",
  "TOOLS",
  "MATERIAL",
  "LODGING",
  "COURIER",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function isRateBased(category: string): category is "FUEL" | "FOOD" {
  return category === "FUEL" || category === "FOOD";
}

export function expenseLineAmount(input: {
  category: string;
  amount?: number | null;
  distanceKm?: number | null;
  foodType?: string | null;
}): number | null {
  if (input.category === "FUEL") {
    if (!input.distanceKm || input.distanceKm <= 0) return null;
    return Math.round(input.distanceKm * FUEL_RATE_PER_KM * 100) / 100;
  }
  if (input.category === "FOOD") {
    if (!input.foodType || !(input.foodType in FOOD_ALLOWANCE)) return null;
    return FOOD_ALLOWANCE[input.foodType as FoodType];
  }
  return input.amount ?? null;
}

export function describeExpenseLine(line: {
  category: string;
  distanceKm?: number | null;
  foodType?: string | null;
}): string | null {
  if (line.category === "FUEL" && line.distanceKm) {
    return `${line.distanceKm} km`;
  }
  if (line.category === "FOOD" && line.foodType) {
    return FOOD_TYPE_LABELS[line.foodType as FoodType] ?? null;
  }
  return null;
}

export const EXPENSE_LINE_PREFIX = "line";

export const EXPENSE_LINE_FIELDS = [
  "category",
  "amount",
  "distanceKm",
  "foodType",
  "note",
] as const;

export function zipExpenseLines(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const rows = new Map<number, Record<string, string>>();
  const pattern = new RegExp(`^${EXPENSE_LINE_PREFIX}\\.(\\d+)\\.(\\w+)$`);

  for (const [key, value] of Object.entries(source)) {
    const match = pattern.exec(key);
    if (!match) {
      result[key] = value;
      continue;
    }
    const index = Number(match[1]);
    const row = rows.get(index) ?? {};
    row[match[2]] = typeof value === "string" ? value : String(value ?? "");
    rows.set(index, row);
  }

  result.items = [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) =>
      Object.fromEntries(EXPENSE_LINE_FIELDS.map((f) => [f, row[f] ?? ""])),
    );

  return result;
}
