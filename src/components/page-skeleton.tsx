export function PageSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      aria-busy="true"
      aria-label="กำลังโหลด"
    >
      <div className="h-8 w-48 rounded bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
