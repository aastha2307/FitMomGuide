import type { MealSlotKey } from "@/lib/meals";

/** One neutral image per meal slot — not tied to meal name */
const SLOT_IMAGE: Record<MealSlotKey, string> = {
  breakfast:
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=640&q=80",
  "afternoon-snack":
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=640&q=80",
  lunch:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=640&q=80",
  "evening-snack":
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=640&q=80",
  dinner:
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=640&q=80",
};

export function mealImageUrl(slot: MealSlotKey): string {
  return SLOT_IMAGE[slot];
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
