export function buildBlinkitSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `https://blinkit.com/s/?q=${q}`;
}

export async function openBlinkitSearch(query: string): Promise<"opened" | "copied"> {
  const url = buildBlinkitSearchUrl(query);
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) return "opened";
  } catch {
    // fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(query);
    return "copied";
  } catch {
    await navigator.clipboard.writeText(url);
    return "copied";
  }
}
