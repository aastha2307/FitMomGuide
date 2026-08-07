import { NextResponse } from "next/server";
import { isGeminiConfigured, parseStatsFromUpload } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mimeType?: string;
      base64?: string;
    };
    if (!body.base64 || !body.mimeType) {
      return NextResponse.json(
        { error: "mimeType and base64 are required" },
        { status: 400 },
      );
    }

    const gemini = isGeminiConfigured();
    const stats = await parseStatsFromUpload({
      mimeType: body.mimeType,
      base64: body.base64,
    });

    return NextResponse.json({ stats, gemini });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 },
    );
  }
}
