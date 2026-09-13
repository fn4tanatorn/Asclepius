/** Shared formatting helpers (Thai locale). */

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "-";
  return `${Number(score).toFixed(Number.isInteger(Number(score)) ? 0 : 2)}%`;
}

/** Turn free text into a URL-safe slug. Keeps Thai characters. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract a YouTube video id from common URL shapes; null if not YouTube. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch {
    /* not a URL */
  }
  return null;
}
