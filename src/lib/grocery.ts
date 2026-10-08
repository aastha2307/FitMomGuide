import { listDayMeals, normalizeDailyMeals } from "@/lib/meals";
import type { GroceryBrandOption, GroceryItem, PlanWeek } from "@/types";

const CATEGORY_ORDER = [
  "Produce",
  "Protein",
  "Dairy",
  "Pantry",
  "Spices",
  "Frozen",
  "Other",
] as const;

function ingredientKey(line: string): string {
  return line
    .toLowerCase()
    .replace(
      /^[\d./\s]+(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|ml|l|liters?|pcs?|pieces?|cloves?|pinch|bunch|small|medium|large|slice?s?)?\s*/i,
      "",
    )
    .replace(/\(.*?\)/g, "")
    .replace(/,.*$/, "")
    .trim();
}

function displayName(key: string): string {
  if (!key) return "Item";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function namesMatch(a: string, b: string): boolean {
  const ka = ingredientKey(a);
  const kb = ingredientKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length >= 4 && kb.length >= 4) {
    return ka.includes(kb) || kb.includes(ka);
  }
  return false;
}

function categoryFor(name: string): string {
  const n = name.toLowerCase();
  if (
    /(onion|tomato|potato|spinach|coriander|mint|lemon|ginger|garlic|vegetable|fruit|banana|apple|carrot|cucumber|capsicum|beans|peas|salad)/.test(
      n,
    )
  ) {
    return "Produce";
  }
  if (
    /(chicken|egg|paneer|fish|tofu|dal|lentil|chickpea|protein|mutton|prawn|soya)/.test(
      n,
    )
  ) {
    return "Protein";
  }
  if (/(milk|curd|yogurt|cheese|butter|ghee|cream)/.test(n)) return "Dairy";
  if (/(turmeric|cumin|coriander powder|chilli|garam|masala|pepper|spice)/.test(n)) {
    return "Spices";
  }
  if (/(frozen|peas)/.test(n)) return "Frozen";
  if (/(rice|oats|flour|oil|salt|sugar|honey|nuts|seeds|millet|bread)/.test(n)) {
    return "Pantry";
  }
  return "Other";
}

function defaultOptions(name: string): GroceryBrandOption[] {
  const q = name.toLowerCase();
  return [
    {
      tier: "best",
      brand: "Premium",
      productLabel: name,
      blinkitQuery: q,
    },
    {
      tier: "budget",
      brand: "Store pick",
      productLabel: name,
      blinkitQuery: q,
    },
    {
      tier: "cleanest",
      brand: "Organic",
      productLabel: `Organic ${name}`,
      blinkitQuery: `organic ${q}`,
    },
  ];
}

function sortGrocery(items: GroceryItem[]): GroceryItem[] {
  return [...items].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]);
    const bi = CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]);
    const ac = ai === -1 ? CATEGORY_ORDER.length : ai;
    const bc = bi === -1 ? CATEGORY_ORDER.length : bi;
    if (ac !== bc) return ac - bc;
    return a.name.localeCompare(b.name);
  });
}

/** Full weekly grocery: plan staples + every ingredient from all 7 days of meals. */
export function buildWeekGroceryList(week: PlanWeek): GroceryItem[] {
  const fromPlan = week.grocery ?? [];
  const ingredientMap = new Map<string, { count: number; sample: string }>();

  for (const day of week.dailyMeals) {
    const normalized = normalizeDailyMeals(day);
    for (const { meal } of listDayMeals(normalized)) {
      const lines = meal.recipe?.ingredients ?? [];
      for (const line of lines) {
        const key = ingredientKey(line);
        if (!key || key.length < 2) continue;
        const prev = ingredientMap.get(key);
        if (prev) {
          prev.count += 1;
        } else {
          ingredientMap.set(key, { count: 1, sample: line });
        }
      }
    }
  }

  const merged: GroceryItem[] = fromPlan.map((item) => ({ ...item }));

  for (const [key, data] of ingredientMap) {
    if (fromPlan.some((g) => namesMatch(g.name, key))) continue;

    merged.push({
      name: displayName(key),
      qty: data.count,
      unit: data.count === 1 ? "meal" : "meals",
      category: categoryFor(key),
      options: defaultOptions(displayName(key)),
    });
  }

  return sortGrocery(merged);
}

export function groupGroceryByCategory(
  items: GroceryItem[],
): Array<{ category: string; items: GroceryItem[] }> {
  const map = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const cat = item.category || "Other";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  const ordered: Array<{ category: string; items: GroceryItem[] }> =
    CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  for (const [category, categoryItems] of map) {
    if (!CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number])) {
      ordered.push({ category, items: categoryItems });
    }
  }
  return ordered;
}
