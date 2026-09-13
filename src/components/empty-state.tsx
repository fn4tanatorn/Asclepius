import { Mascot } from "./mascot";

/**
 * Illustrated placeholder for "nothing here yet" screens. Keep this for
 * pages the visitor lands on with no data (course/exam lists, results,
 * feedback) — dense in-page states (e.g. a filtered table) can stay with
 * a plain text line instead.
 */
export function EmptyState({
  title,
  description,
  mood = "happy",
  action,
}: {
  title: string;
  description?: string;
  mood?: React.ComponentProps<typeof Mascot>["mood"];
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border-2 border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <Mascot mood={mood} className="mx-auto" />
      <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
