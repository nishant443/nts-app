export const TRAVEL_RATE_PER_KM = 5;

export const FOOD_ALLOWANCE = {
  LOCAL: 200,
  OUTSTATION: 500,
} as const;

export type FoodType = keyof typeof FOOD_ALLOWANCE;

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  LOCAL: "Local",
  OUTSTATION: "Outstation",
};

export function isRateBased(category: string): category is "TRAVEL" | "FOOD" {
  return category === "TRAVEL" || category === "FOOD";
}

export function expenseAmount(input: {
  category: string;
  amount?: number | null;
  distanceKm?: number | null;
  foodType?: string | null;
}): number | null {
  if (input.category === "TRAVEL") {
    if (!input.distanceKm || input.distanceKm <= 0) return null;
    return Math.round(input.distanceKm * TRAVEL_RATE_PER_KM * 100) / 100;
  }
  if (input.category === "FOOD") {
    if (!input.foodType || !(input.foodType in FOOD_ALLOWANCE)) return null;
    return FOOD_ALLOWANCE[input.foodType as FoodType];
  }
  return input.amount ?? null;
}
