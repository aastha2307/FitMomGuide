import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ gemini: isGeminiConfigured() });
}
