export function buildBlinkitSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `https://blinkit.com/s/?q=${q}`;
}

export async function openBlinkitSearch(
  query: string,
): Promise<"opened" | "copied" | "failed"> {
  const url = buildBlinkitSearchUrl(query);

  try {
    // Anchor click is more reliable than window.open + noopener
    // (noopener makes window.open return null even when the tab opens).
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
