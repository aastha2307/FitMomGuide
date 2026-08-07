import type { YoutubeVideoResult } from "@/lib/youtube-api";

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export async function fetchTopYoutubeVideo(
  query: string,
): Promise<YoutubeVideoResult> {
  const res = await fetch(
    `/api/youtube-video?q=${encodeURIComponent(query.trim())}`,
  );
  const data = (await res.json()) as {
    video?: YoutubeVideoResult;
    error?: string;
  };
  if (!res.ok || !data.video) {
    throw new Error(data.error || "Could not find a YouTube video");
  }
  return data.video;
}

export async function openYoutubeVideo(
  query: string,
): Promise<"opened" | "copied" | "failed"> {
  try {
    const video = await fetchTopYoutubeVideo(query);
    const url = youtubeWatchUrl(video.videoId);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return "opened";
  } catch {
    // fall through
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(query);
      return "copied";
    }
  } catch {
    // fall through
  }

  return "failed";
}

export type { YoutubeVideoResult };
