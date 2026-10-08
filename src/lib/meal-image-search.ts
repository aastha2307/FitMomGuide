import type { MealSlotKey } from "@/lib/meals";

type CuratedImage = {
  keywords: string[];
  url: string;
};

/** Hand-picked Unsplash photos aligned to common plan meal names */
const CURATED: CuratedImage[] = [
  {
    keywords: ["oats", "overnight", "porridge", "muesli"],
    url: "https://images.unsplash.com/photo-1517673400265-9b6e51b4a537?w=800&q=80",
  },
  {
    keywords: ["poha", "flattened rice"],
    url: "https://images.unsplash.com/photo-1585937421612-70a008296fbe?w=800&q=80",
  },
  {
    keywords: ["upma", "semolina"],
    url: "https://images.unsplash.com/photo-1589302168068-9644a2f2fbd6?w=800&q=80",
  },
  {
    keywords: ["idli", "idlis"],
    url: "https://images.unsplash.com/photo-1642822034133-70de6ebe4b9a?w=800&q=80",
  },
  {
    keywords: ["dosa", "dosai"],
    url: "https://images.unsplash.com/photo-1630387172875-e67e8c78e86f?w=800&q=80",
  },
  {
    keywords: ["paratha", "roti", "chapati", "thepla"],
    url: "https://images.unsplash.com/photo-1626080742638-360e68f7ccbb?w=800&q=80",
  },
  {
    keywords: ["biryani", "pulao", "pilaf"],
    url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80",
  },
  {
    keywords: ["khichdi", "kitchari"],
    url: "https://images.unsplash.com/photo-1589302168068-9644a2f2fbd6?w=800&q=80",
  },
  {
    keywords: ["dal", "lentil", "sambar", "rasam"],
    url: "https://images.unsplash.com/photo-1585937421612-70a008296fbe?w=800&q=80",
  },
  {
    keywords: ["paneer", "tikka", "palak"],
    url: "https://images.unsplash.com/photo-1606495184653-f5ba92560e78?w=800&q=80",
  },
  {
    keywords: ["chicken", "tandoori"],
    url: "https://images.unsplash.com/photo-1604908179214-a2078dbb951?w=800&q=80",
  },
  {
    keywords: ["fish", "salmon", "prawn", "shrimp"],
    url: "https://images.unsplash.com/photo-1519708227418-c8fd9a37b02a?w=800&q=80",
  },
  {
    keywords: ["egg", "omelette", "bhurji"],
    url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
  },
  {
    keywords: ["tofu", "soya"],
    url: "https://images.unsplash.com/photo-1540420773420-0367fefd8a91?w=800&q=80",
  },
  {
    keywords: ["stir", "sabzi", "curry", "masala"],
    url: "https://images.unsplash.com/photo-1585937421612-70a008296fbe?w=800&q=80",
  },
  {
    keywords: ["salad", "bowl"],
    url: "https://images.unsplash.com/photo-1512621776951-a57141f2eef8?w=800&q=80",
  },
  {
    keywords: ["rice", "millet", "quinoa"],
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  },
  {
    keywords: ["soup", "shorba"],
    url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
  },
  {
    keywords: ["sandwich", "wrap"],
    url: "https://images.unsplash.com/photo-1528731705312-bfc42529bcb0?w=800&q=80",
  },
  {
    keywords: ["smoothie", "shake"],
    url: "https://images.unsplash.com/photo-1490470098762-82804901973c?w=800&q=80",
  },
  {
    keywords: ["makhana", "foxnut"],
    url: "https://images.unsplash.com/photo-1599599810769-bcde5a16007e?w=800&q=80",
  },
  {
    keywords: ["fruit", "banana", "apple", "berry", "mango"],
    url: "https://images.unsplash.com/photo-1550258987-190b2f6c2ab6?w=800&q=80",
  },
  {
    keywords: ["almond", "peanut", "nut", "seed"],
    url: "https://images.unsplash.com/photo-1599599810769-bcde5a16007e?w=800&q=80",
  },
  {
    keywords: ["curd", "yogurt", "raita", "lassi"],
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
  },
  {
    keywords: ["tea", "chai"],
    url: "https://images.unsplash.com/photo-1556672553-1efda58965fd?w=800&q=80",
  },
];

const SLOT_FALLBACK: Record<MealSlotKey, string> = {
  breakfast:
    "https://images.unsplash.com/photo-1517673400265-9b6e51b4a537?w=800&q=80",
  "afternoon-snack":
    "https://images.unsplash.com/photo-1599599810769-bcde5a16007e?w=800&q=80",
  lunch:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  "evening-snack":
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80",
  dinner:
    "https://images.unsplash.com/photo-1585937421612-70a008296fbe?w=800&q=80",
};

function haystackFor(mealName: string, imageQuery?: string): string {
  return `${imageQuery ?? ""} ${mealName}`.toLowerCase();
}

export function resolveMealImageUrl(params: {
  mealName: string;
  slot: MealSlotKey;
  imageQuery?: string;
  imageUrl?: string;
}): string {
  if (params.imageUrl) return params.imageUrl;

  const haystack = haystackFor(params.mealName, params.imageQuery);
  let best: { score: number; url: string } | null = null;

  for (const entry of CURATED) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (haystack.includes(keyword)) score += keyword.length + 2;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, url: entry.url };
    }
  }

  return best?.url ?? SLOT_FALLBACK[params.slot];
}

function unsplashAccessKey(): string | undefined {
  return process.env.UNSPLASH_ACCESS_KEY;
}

export async function searchUnsplashImage(query: string): Promise<string | null> {
  const key = unsplashAccessKey();
  if (!key) return null;

  const q = query.trim();
  if (!q) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    results?: Array<{ urls?: { regular?: string } }>;
  };
  const regular = data.results?.[0]?.urls?.regular;
  if (!regular) return null;
  return `${regular.split("?")[0]}?w=800&q=80`;
}

export async function findMealImageUrl(params: {
  mealName: string;
  slot?: MealSlotKey;
  imageQuery?: string;
}): Promise<string> {
  const slot = params.slot ?? "lunch";
  const searchQuery =
    params.imageQuery?.trim() ||
    `${params.mealName} indian home cooked food`;

  const fromUnsplash = await searchUnsplashImage(searchQuery);
  if (fromUnsplash) return fromUnsplash;

  return resolveMealImageUrl({
    mealName: params.mealName,
    slot,
    imageQuery: params.imageQuery,
  });
}
