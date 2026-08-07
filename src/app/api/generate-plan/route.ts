import { NextResponse } from "next/server";
import { generateMonthlyPlanAi, isGeminiConfigured } from "@/lib/ai/gemini";
import type { BodyStats, UserProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profile?: UserProfile;
      stats?: BodyStats;
      statsId?: string;
    };

    if (!body.profile || !body.stats || !body.statsId) {
      return NextResponse.json(
        { error: "profile, stats, and statsId are required" },
        { status: 400 },
      );
    }

    const gemini = isGeminiConfigured();
    const plan = await generateMonthlyPlanAi({
      profile: body.profile,
      stats: body.stats,
      statsId: body.statsId,
    });

    return NextResponse.json({ plan, gemini });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
