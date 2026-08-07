const cache = new Map<
  string,
  { at: number; result: YoutubeVideoResult }
>();
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 hours

export interface YoutubeVideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount?: number;
}

export function getYoutubeApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
}

export function isYoutubeConfigured(): boolean {
  return Boolean(getYoutubeApiKey());
}

export async function findTopYoutubeVideo(
  query: string,
): Promise<YoutubeVideoResult> {
  const q = query.trim();
  if (!q) throw new Error("Search query is required");

  const cached = cache.get(q.toLowerCase());
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.result;
  }

  const key = getYoutubeApiKey();
  if (!key) {
    throw new Error(
      "YouTube API is not configured. Add YOUTUBE_API_KEY to .env.local (YouTube Data API v3 enabled).",
    );
  }

  const searchParams = new URLSearchParams({
    part: "snippet",
    q,
    type: "video",
    order: "viewCount",
    maxResults: "5",
    safeSearch: "strict",
    relevanceLanguage: "en",
    key,
  });

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
  );

  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`YouTube search failed (${searchRes.status}): ${text}`);
  }

  const searchData = (await searchRes.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }>;
  };

  const candidates =
    searchData.items
      ?.map((item) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
      }))
      .filter(
        (item): item is { videoId: string; title: string; channelTitle: string } =>
          Boolean(item.videoId && item.title && item.channelTitle),
      ) ?? [];

  if (candidates.length === 0) {
    throw new Error("No YouTube videos found for this workout.");
  }

  const ids = candidates.map((c) => c.videoId).join(",");
  const statsParams = new URLSearchParams({
    part: "statistics,snippet",
    id: ids,
    key,
  });

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${statsParams}`,
  );

  if (!statsRes.ok) {
    const first = candidates[0];
    const result: YoutubeVideoResult = {
      videoId: first.videoId,
      title: first.title,
      channelTitle: first.channelTitle,
    };
    cache.set(q.toLowerCase(), { at: Date.now(), result });
    return result;
  }

  const statsData = (await statsRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; channelTitle?: string };
      statistics?: { viewCount?: string };
    }>;
  };

  const ranked =
    statsData.items
      ?.map((item) => ({
        videoId: item.id,
        title: item.snippet?.title ?? "YouTube video",
        channelTitle: item.snippet?.channelTitle ?? "YouTube",
        viewCount: Number(item.statistics?.viewCount ?? 0),
      }))
      .sort((a, b) => b.viewCount - a.viewCount) ?? [];

  const top = ranked[0] ?? {
    ...candidates[0],
    viewCount: undefined,
  };

  const result: YoutubeVideoResult = {
    videoId: top.videoId,
    title: top.title,
    channelTitle: top.channelTitle,
    viewCount: top.viewCount,
  };

  cache.set(q.toLowerCase(), { at: Date.now(), result });
  return result;
}
