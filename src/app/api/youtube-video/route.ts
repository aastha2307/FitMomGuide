import { NextResponse } from "next/server";
import {
  findTopYoutubeVideo,
  isYoutubeConfigured,
} from "@/lib/youtube-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const video = await findTopYoutubeVideo(q);
    return NextResponse.json({ video, configured: isYoutubeConfigured() });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "YouTube lookup failed",
        configured: isYoutubeConfigured(),
      },
      { status: 500 },
    );
  }
}
