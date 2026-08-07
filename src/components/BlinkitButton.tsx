"use client";

import { useState } from "react";
import { openBlinkitSearch } from "@/lib/blinkit";

export function BlinkitButton({
  query,
  label = "Add in Blinkit",
}: {
  query: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="blinkit-wrap">
      <button
        type="button"
        className="btn btn-blinkit"
        onClick={async () => {
          const result = await openBlinkitSearch(query);
          setStatus(
            result === "opened"
              ? "Opening Blinkit…"
              : "Copied search — paste in Blinkit",
          );
          window.setTimeout(() => setStatus(null), 2500);
        }}
      >
        {label}
      </button>
      {status ? <p className="hint">{status}</p> : null}
    </div>
  );
}
