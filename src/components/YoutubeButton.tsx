"use client";

import { useState } from "react";
import { openYoutubeVideo } from "@/lib/youtube";

export function YoutubeButton({
  query,
  label = "Watch on YouTube",
  className = "btn btn-secondary",
}: {
  query: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="blinkit-wrap">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setStatus("Finding video…");
          const result = await openYoutubeVideo(query);
          setBusy(false);
          setStatus(
            result === "opened"
              ? "Opening YouTube…"
              : result === "copied"
                ? "Copied search — try again or search manually"
                : "Couldn’t open video — check YOUTUBE_API_KEY",
          );
          window.setTimeout(() => setStatus(null), 2500);
        }}
      >
        {busy ? "Loading…" : label}
      </button>
      {status ? <p className="hint">{status}</p> : null}
    </div>
  );
}
