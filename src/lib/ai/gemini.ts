import type { BodyStats, MonthlyPlan, UserProfile } from "@/types";
import { buildMockMonthlyPlan } from "@/lib/mock-plan";
import {
  monthlyPlanSystemPrompt,
  monthlyPlanUserPrompt,
  parseStatsSystemPrompt,
} from "@/lib/ai/prompts";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
}

async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("NO_GEMINI_KEY");

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
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
    return {
      monthStart: new Date().toISOString().slice(0, 10),
      groundedOnStatsId: statsId,
      summary: parsed.summary,
      weeks: parsed.weeks,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "NO_GEMINI_KEY") {
      return buildMockMonthlyPlan(profile, stats, statsId);
    }
    // Fall back to mock if model returns bad JSON so MVP still works
    console.error("generateMonthlyPlanAi failed, using mock", err);
    return buildMockMonthlyPlan(profile, stats, statsId);
  }
}
