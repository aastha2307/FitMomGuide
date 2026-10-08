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

type CanonicalRule = {
  key: string;
  label: string;
  pattern: RegExp;
};

/** Map recipe wording variants to one shopping-list ingredient. */
const CANONICAL_RULES: CanonicalRule[] = [
  {
    key: "eggs",
    label: "Eggs",
    pattern:
      /\b(eggs?|egg whites?|boiled eggs?|hard[\s-]?boiled eggs?|beaten eggs?)\b/i,
  },
  {
    key: "onion",
    label: "Onion",
    pattern: /\b(onions?|red onion|spring onion|shallots?)\b/i,
  },
  {
    key: "tomato",
    label: "Tomato",
    pattern: /\b(tomatoes?|cherry tomatoes?)\b/i,
  },
  {
    key: "garlic",
    label: "Garlic",
    pattern: /\b(garlic|garlic cloves?|minced garlic)\b/i,
  },
  {
    key: "ginger",
    label: "Ginger",
    pattern: /\b(ginger|ginger paste|grated ginger)\b/i,
  },
  {
    key: "potato",
    label: "Potato",
    pattern: /\b(potatoes?|baby potatoes?)\b/i,
  },
  {
    key: "rice",
    label: "Rice",
    pattern: /\b(rice|cooked rice|basmati|brown rice|millets?)\b/i,
  },
  {
    key: "oats",
    label: "Oats",
    pattern: /\b(oats?|rolled oats?|oatmeal)\b/i,
  },
  {
    key: "paneer",
    label: "Paneer",
    pattern: /\b(paneer|cottage cheese)\b/i,
  },
  {
    key: "chicken",
    label: "Chicken",
    pattern: /\b(chicken|chicken breast|boneless chicken)\b/i,
  },
  {
    key: "curd",
    label: "Curd / yogurt",
    pattern: /\b(curd|yogurt|yoghurt|dahi|greek yogurt)\b/i,
  },
  {
    key: "milk",
    label: "Milk",
    pattern: /\b(milk|skim milk|toned milk)\b/i,
  },
  {
    key: "oil",
    label: "Cooking oil",
    pattern: /\b(oil|cooking oil|olive oil|mustard oil|vegetable oil|ghee)\b/i,
  },
  {
    key: "salt",
    label: "Salt",
    pattern: /\b(salt|sea salt|rock salt)\b/i,
  },
  {
    key: "coriander",
    label: "Coriander",
    pattern: /\b(coriander|cilantro|coriander leaves?|fresh coriander)\b/i,
  },
  {
    key: "lemon",
    label: "Lemon",
    pattern: /\b(lemon|lime|lemon juice)\b/i,
  },
  {
    key: "spinach",
    label: "Spinach",
    pattern: /\b(spinach|palak)\b/i,
  },
  {
    key: "dal",
    label: "Dal / lentils",
    pattern: /\b(dal|lentils?|toor dal|moong dal|masoor dal)\b/i,
  },
  {
    key: "chickpea",
    label: "Chickpeas",
    pattern: /\b(chickpeas?|chana|kabuli chana)\b/i,
  },
  {
    key: "tofu",
    label: "Tofu",
    pattern: /\b(tofu|soya paneer)\b/i,
  },
  {
    key: "banana",
    label: "Banana",
    pattern: /\b(bananas?)\b/i,
  },
  {
    key: "apple",
    label: "Apple",
    pattern: /\b(apples?)\b/i,
  },
  {
    key: "turmeric",
    label: "Turmeric",
    pattern: /\b(turmeric|haldi)\b/i,
  },
  {
    key: "cumin",
    label: "Cumin",
    pattern: /\b(cumin|jeera|cumin seeds?)\b/i,
  },
  {
    key: "chilli",
    label: "Chilli",
    pattern: /\b(chilli|chili|green chilli|red chilli|mirch)\b/i,
  },
];

const PREP_WORDS =
  /\b(chopped|diced|sliced|minced|grated|fresh|boiled|cooked|raw|beaten|hard[\s-]?boiled|finely|roughly|crushed|ground|whole|large|small|medium|optional|to taste)\b/gi;

function ingredientKey(line: string): string {
  return line
    .toLowerCase()
    .replace(
      /^[\d./\s]+(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|ml|l|liters?|pcs?|pieces?|cloves?|pinch|bunch|small|medium|large|slice?s?)?\s*/i,
      "",
    )
    .replace(/\(.*?\)/g, "")
    .replace(/,.*$/, "")
    .replace(PREP_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalGroceryKey(raw: string): { key: string; label: string } {
  const normalized = raw.toLowerCase().trim();
  if (!normalized) return { key: "item", label: "Item" };

  for (const rule of CANONICAL_RULES) {
    if (rule.pattern.test(normalized)) {
      return { key: rule.key, label: rule.label };
    }
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    const tail = words.slice(-2).join(" ");
    for (const rule of CANONICAL_RULES) {
      if (rule.pattern.test(tail)) return { key: rule.key, label: rule.label };
    }
    const head = words.slice(0, 2).join(" ");
    for (const rule of CANONICAL_RULES) {
      if (rule.pattern.test(head)) return { key: rule.key, label: rule.label };
    }
  }

  const key = normalized;
  return { key, label: titleCase(key) };
}

function titleCase(s: string): string {
  if (!s) return "Item";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function canonicalFromText(text: string): { key: string; label: string } {
  return canonicalGroceryKey(ingredientKey(text));
}

function namesMatch(a: string, b: string): boolean {
  const ca = canonicalFromText(a);
  const cb = canonicalFromText(b);
  return ca.key === cb.key;
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
      tier: "budget",
      brand: "Store pick",
      productLabel: name,
      blinkitQuery: q,
    },
  ];
}

export function budgetGroceryOption(item: GroceryItem): GroceryBrandOption {
  const pick =
    item.options.find((o) => o.tier === "budget") ?? item.options[0];
  if (pick) return { ...pick, tier: "budget" };
  return defaultOptions(item.name)[0];
}

function withBudgetOptionOnly(item: GroceryItem): GroceryItem {
  return { ...item, options: [budgetGroceryOption(item)] };
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

function mergeGroceryItems(items: GroceryItem[]): GroceryItem[] {
  const map = new Map<string, GroceryItem>();

  for (const item of items) {
    const { key, label } = canonicalFromText(item.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        name: label,
        category: categoryFor(label),
        options: defaultOptions(label),
      });
      continue;
    }
    existing.qty += item.qty;
    const existingPick = budgetGroceryOption(existing);
    const itemPick = budgetGroceryOption(item);
    if (
      existingPick.blinkitQuery === label.toLowerCase() &&
      itemPick.blinkitQuery !== label.toLowerCase()
    ) {
      existing.options = item.options.length ? item.options : existing.options;
    }
  }

  return Array.from(map.values());
}

/** Full weekly grocery: plan staples + every ingredient from all 7 days of meals. */
export function buildWeekGroceryList(week: PlanWeek): GroceryItem[] {
  const fromPlan = week.grocery ?? [];
  const ingredientMap = new Map<string, { count: number }>();

  for (const day of week.dailyMeals) {
    const normalized = normalizeDailyMeals(day);
    for (const { meal } of listDayMeals(normalized)) {
      const lines = meal.recipe?.ingredients ?? [];
      for (const line of lines) {
        const { key } = canonicalFromText(line);
        if (!key || key === "item") continue;
        const prev = ingredientMap.get(key);
        if (prev) prev.count += 1;
        else ingredientMap.set(key, { count: 1 });
      }
    }
  }

  const merged: GroceryItem[] = fromPlan.map((item) => ({ ...item }));

  for (const [key, data] of ingredientMap) {
    const label = canonicalGroceryKey(key).label;
    if (fromPlan.some((g) => namesMatch(g.name, label))) continue;

    merged.push({
      name: label,
      qty: data.count,
      unit: data.count === 1 ? "meal" : "meals",
      category: categoryFor(label),
      options: defaultOptions(label),
    });
  }

  return sortGrocery(mergeGroceryItems(merged).map(withBudgetOptionOnly));
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
