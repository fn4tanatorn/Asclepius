/** Shared Tailwind class strings built on the design tokens in globals.css. */

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-soft transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:hover:brightness-100",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger transition hover:brightness-105 disabled:opacity-50",
  link: "text-sm font-medium text-ink-2 underline-offset-4 hover:text-brand hover:underline",
};

export const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

export const card =
  "rounded-card border border-line bg-surface p-5 shadow-soft";

export const label = "block space-y-1.5 text-sm font-medium text-ink";

export const badge = {
  green:
    "inline-flex rounded-pill bg-mint-soft px-2.5 py-0.5 text-xs font-semibold text-mint",
  gray: "inline-flex rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-2",
  red: "inline-flex rounded-pill bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger",
  amber:
    "inline-flex rounded-pill bg-lemon-soft px-2.5 py-0.5 text-xs font-semibold text-lemon",
  blue: "inline-flex rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand",
  pink: "inline-flex rounded-pill bg-pink-soft px-2.5 py-0.5 text-xs font-semibold text-pink",
};

/** Dashed empty-state box. */
export const empty =
  "rounded-card border-2 border-dashed border-line bg-surface/60 px-6 py-12 text-center text-ink-2";

/** Alert boxes used for flash/error messages. */
export const alert = {
  error:
    "rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger",
  ok: "rounded-xl border border-mint/30 bg-mint-soft px-4 py-3 text-sm text-mint",
  warn: "rounded-xl border border-lemon/40 bg-lemon-soft px-4 py-3 text-sm text-lemon",
};

/**
 * Tinted icon-tile colors, cycled by index across a list of cards so a
 * grid of courses/exams reads as organized without implying real
 * categories the data doesn't have.
 */
export const cardTints = [
  { bg: "bg-brand-soft", text: "text-brand" },
  { bg: "bg-pink-soft", text: "text-pink" },
  { bg: "bg-mint-soft", text: "text-mint" },
  { bg: "bg-lemon-soft", text: "text-lemon" },
  { bg: "bg-lavender-soft", text: "text-lavender" },
] as const;

export function cardTint(index: number) {
  return cardTints[index % cardTints.length];
}
