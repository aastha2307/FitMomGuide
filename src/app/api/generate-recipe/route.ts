import { NextResponse } from "next/server";
import { generateRecipeAi, isGeminiConfigured } from "@/lib/ai/gemini";
import type { MealSlot } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      meal?: Pick<MealSlot, "name" | "calories" | "prepNotes">;
      dietType?: string;
      cuisines?: string[];
    };

    if (!body.meal?.name) {
      return NextResponse.json({ error: "meal.name is required" }, { status: 400 });
    }

    const recipe = await generateRecipeAi({
      meal: body.meal,
      dietType: body.dietType,
      cuisines: body.cuisines,
    });

    return NextResponse.json({
      recipe,
      gemini: isGeminiConfigured(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recipe generation failed" },
      { status: 500 },
    );
  }
}
