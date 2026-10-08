import type {
  BodyStats,
  MealRecipe,
  MealSlot,
  MonthlyPlan,
  UserProfile,
} from "@/types";
import { buildMockMonthlyPlan } from "@/lib/mock-plan";
import { normalizeMonthlyPlan, type MealSlotKey } from "@/lib/meals";
import { findMealImageUrl } from "@/lib/meal-image-search";
import {
  monthlyPlanSystemPrompt,
  monthlyPlanUserPrompt,
  parseStatsSystemPrompt,
  recipeSystemPrompt,
} from "@/lib/ai/prompts";

function getModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

function geminiUrl(model = getModel()): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getApiKey());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  parts: Array<Record<string, unknown>>,
  attempt = 0,
  generationConfig?: Record<string, unknown>,
): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("NO_GEMINI_KEY");

  const res = await fetch(`${geminiUrl()}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
        ...generationConfig,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429 && attempt < 2) {
      const retryMatch = /retry in ([\d.]+)s/i.exec(text);
      const waitMs = Math.min(
        45000,
        Math.ceil((retryMatch ? Number(retryMatch[1]) : 5) * 1000),
      );
      await sleep(waitMs);
      return callGemini(parts, attempt + 1, generationConfig);
    }
    if (res.status === 429) {
      throw new Error(
        "Gemini quota exceeded for this API key/model. Wait a minute, or set GEMINI_MODEL / enable billing in Google AI Studio.",
      );
    }
    throw new Error(`Gemini error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

function extractJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Failed to parse AI JSON");
  }
}

export async function parseStatsFromUpload(params: {
  mimeType: string;
  base64: string;
}): Promise<Partial<BodyStats> & { notes?: string }> {
  try {
    const text = await callGemini([
      { text: parseStatsSystemPrompt() },
      {
        inline_data: {
          mime_type: params.mimeType,
          data: params.base64,
        },
      },
    ]);
    return extractJson(text);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_GEMINI_KEY") {
      return {
        notes: "Demo parse: set GEMINI_API_KEY for real extraction.",
      };
    }
    throw err;
  }
}

export async function generateMonthlyPlanAi(params: {
  profile: UserProfile;
  stats: BodyStats;
  statsId: string;
}): Promise<MonthlyPlan> {
  const { profile, stats, statsId } = params;
  try {
    const text = await callGemini([
      {
        text: `${monthlyPlanSystemPrompt()}\n\nUser context:\n${monthlyPlanUserPrompt(profile, stats)}`,
      },
    ]);
    const parsed = extractJson<{
      summary: string;
      weeks: MonthlyPlan["weeks"];
    }>(text);
    return normalizeMonthlyPlan({
      monthStart: new Date().toISOString().slice(0, 10),
      groundedOnStatsId: statsId,
      summary: parsed.summary,
      weeks: parsed.weeks,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_GEMINI_KEY") {
      return buildMockMonthlyPlan(profile, stats, statsId);
    }
    // Fall back to mock if model returns bad JSON so MVP still works
    console.error("generateMonthlyPlanAi failed, using mock", err);
    return buildMockMonthlyPlan(profile, stats, statsId);
  }
}

function normalizeMealRecipe(raw: MealRecipe, mealName: string): MealRecipe {
  return {
    servings: Math.max(1, Number(raw.servings) || 1),
    prepMins: Math.max(0, Number(raw.prepMins) || 10),
    cookMins: Math.max(0, Number(raw.cookMins) || 15),
    ingredients: (raw.ingredients ?? []).map((s) => s.trim()).filter(Boolean),
    steps: (raw.steps ?? []).map((s) => s.trim()).filter(Boolean),
    tips: raw.tips?.trim(),
    imageQuery: raw.imageQuery?.trim() || mealName,
    imageUrl: raw.imageUrl,
  };
}

function isRecipeThin(recipe: MealRecipe): boolean {
  return recipe.ingredients.length < 6 || recipe.steps.length < 5;
}

async function attachMealImage(
  recipe: MealRecipe,
  mealName: string,
  slot?: MealSlotKey,
): Promise<MealRecipe> {
  const imageUrl = await findMealImageUrl({
    mealName,
    slot,
    imageQuery: recipe.imageQuery,
  });
  return { ...recipe, imageUrl };
}

export async function generateRecipeAi(params: {
  meal: Pick<MealSlot, "name" | "calories" | "prepNotes">;
  dietType?: string;
  cuisines?: string[];
  slot?: MealSlotKey;
}): Promise<MealRecipe> {
  const { meal, dietType, cuisines, slot } = params;
  try {
    const text = await callGemini(
      [
        {
          text: `${recipeSystemPrompt()}\n\nMeal: ${JSON.stringify({
            name: meal.name,
            calories: meal.calories,
            prepNotes: meal.prepNotes,
            dietType: dietType ?? "veg",
            cuisines: cuisines ?? ["Indian"],
          })}`,
        },
      ],
      0,
      { temperature: 0.55, maxOutputTokens: 8192 },
    );
    const parsed = normalizeMealRecipe(extractJson<MealRecipe>(text), meal.name);
    if (isRecipeThin(parsed)) {
      throw new Error("Thin recipe from model");
    }
    return attachMealImage(parsed, meal.name, slot);
  } catch (err) {
    if (!(err instanceof Error && err.message === "NO_GEMINI_KEY")) {
      console.error("generateRecipeAi failed, using fallback", err);
    }
    const fallback = normalizeMealRecipe(
      {
        servings: 2,
        prepMins: 12,
        cookMins: 18,
        imageQuery: meal.name,
        ingredients: [
          "1 tbsp oil (or ghee)",
          "1/2 tsp cumin seeds",
          "1 small onion, finely chopped",
          "1 tsp ginger-garlic paste",
          "1/2 tsp turmeric powder",
          "1/2 tsp red chilli powder (adjust to taste)",
          "1 tsp coriander powder",
          "Salt to taste",
          "2 tbsp fresh coriander, chopped",
          "Main produce/protein for this dish (see meal name)",
        ],
        steps: [
          "Read through ingredients and prep bowl, knife, and pan before you start.",
          "Wash and chop vegetables; measure spices into a small bowl.",
          `Heat oil in a pan on medium. Add cumin; when it splutters, add onion and cook 2–3 minutes until soft.`,
          "Stir in ginger-garlic paste; cook 30 seconds until fragrant (do not burn).",
          "Add turmeric, chilli, and coriander with a splash of water; cook 1 minute.",
          `Add the main ingredients for "${meal.name}"; cook on medium, stirring, until done (about 8–12 minutes).`,
          "Adjust salt and consistency with 2–4 tbsp water if needed; finish with fresh coriander.",
          "Rest 2 minutes off heat, then plate and serve as noted in prep notes.",
        ],
        tips:
          meal.prepNotes ||
          "Double batch grains or protein on Sunday to cut weekday cook time.",
      },
      meal.name,
    );
    return attachMealImage(fallback, meal.name, slot);
  }
}
