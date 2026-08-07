import type {
  BodyStats,
  MealRecipe,
  MealSlot,
  MonthlyPlan,
  UserProfile,
} from "@/types";
import { buildMockMonthlyPlan } from "@/lib/mock-plan";
import { normalizeMonthlyPlan } from "@/lib/meals";
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
      return callGemini(parts, attempt + 1);
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

export async function generateRecipeAi(params: {
  meal: Pick<MealSlot, "name" | "calories" | "prepNotes">;
  dietType?: string;
  cuisines?: string[];
}): Promise<MealRecipe> {
  const { meal, dietType, cuisines } = params;
  try {
    const text = await callGemini([
      {
        text: `${recipeSystemPrompt()}\n\nMeal: ${JSON.stringify({
          name: meal.name,
          calories: meal.calories,
          prepNotes: meal.prepNotes,
          dietType: dietType ?? "veg",
          cuisines: cuisines ?? ["Indian"],
        })}`,
      },
    ]);
    return extractJson<MealRecipe>(text);
  } catch (err) {
    if (!(err instanceof Error && err.message === "NO_GEMINI_KEY")) {
      console.error("generateRecipeAi failed, using fallback", err);
    }
    return {
      servings: 1,
      prepMins: 10,
      cookMins: 15,
      ingredients: [
        `Ingredients for ${meal.name}`,
        "Salt and spices to taste",
        "1 tsp oil (if cooking)",
      ],
      steps: [
        `Prep ingredients for ${meal.name}.`,
        meal.prepNotes || "Cook using your usual home method.",
        "Plate and serve warm.",
      ],
      tips: "Add GEMINI_API_KEY to .env.local for a fuller AI recipe.",
    };
  }
}
