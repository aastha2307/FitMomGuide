import type { MealSlotKey } from "@/lib/meals";
import { resolveMealImageUrl } from "@/lib/meal-image-search";

export function mealImageUrl(
  slot: MealSlotKey,
  mealName?: string,
  options?: { imageQuery?: string; imageUrl?: string },
): string {
  if (!mealName) {
    return resolveMealImageUrl({ mealName: "", slot, ...options });
  }
  return resolveMealImageUrl({
    mealName,
    slot,
    imageQuery: options?.imageQuery,
    imageUrl: options?.imageUrl,
  });
}

export function mealSlotTone(slot: MealSlotKey): string {
  switch (slot) {
    case "breakfast":
      return "meal-tone-breakfast";
    case "afternoon-snack":
      return "meal-tone-snack";
    case "lunch":
      return "meal-tone-lunch";
    case "evening-snack":
      return "meal-tone-evening";
    case "dinner":
      return "meal-tone-dinner";
    default:
      return "meal-tone-lunch";
  }
}
