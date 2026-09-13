import { formatDateTime } from "./format";

export type ExamWindow = {
  is_published: boolean;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number | null;
};

export type Availability =
  | { state: "open"; label: string }
  | { state: "upcoming"; label: string }
  | { state: "closed"; label: string }
  | { state: "draft"; label: string };

/** Availability by time window only (attempt limit is handled separately). */
export function examAvailability(
  e: ExamWindow,
  now = Date.now(),
): Availability {
  if (!e.is_published) return { state: "draft", label: "ยังไม่เผยแพร่" };
  const opens = e.opens_at ? new Date(e.opens_at).getTime() : null;
  const closes = e.closes_at ? new Date(e.closes_at).getTime() : null;
  if (opens && now < opens)
    return { state: "upcoming", label: `เปิด ${formatDateTime(e.opens_at)}` };
  if (closes && now >= closes)
    return { state: "closed", label: `ปิดแล้ว ${formatDateTime(e.closes_at)}` };
  if (closes)
    return { state: "open", label: `เปิดถึง ${formatDateTime(e.closes_at)}` };
  return { state: "open", label: "เปิดตลอด" };
}

export function attemptsLabel(max: number | null, used: number): string {
  if (max == null) return "ทำได้ไม่จำกัด";
  return `ทำได้ ${max} ครั้ง (ใช้ไปแล้ว ${used})`;
}

export function attemptsLeft(max: number | null, used: number): boolean {
  return max == null || used < max;
}

// ---- datetime-local <-> ISO in Asia/Bangkok (admin forms) ----
const BKK_OFFSET = "+07:00";

/** ISO → "YYYY-MM-DDTHH:mm" in Bangkok time, for <input type="datetime-local">. */
export function toBangkokLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" (Bangkok wall clock) → ISO string; null if empty/invalid. */
export function fromBangkokLocalInput(
  v: string | null | undefined,
): string | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${BKK_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Earliest of the per-attempt time limit and the exam's closing time (ms epoch), or null. */
export function deadlineOf(
  startedAt: string,
  limitMinutes: number | null,
  closesAt: string | null,
): number | null {
  const byLimit = limitMinutes
    ? new Date(startedAt).getTime() + limitMinutes * 60_000
    : null;
  const byClose = closesAt ? new Date(closesAt).getTime() : null;
  if (byLimit == null) return byClose;
  if (byClose == null) return byLimit;
  return Math.min(byLimit, byClose);
}
