/** Page heading with a tinted icon tile, matching the design mockups. */
export function PageTitle({
  icon,
  title,
  subtitle,
  tint = "brand",
  actions,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tint?: "brand" | "pink" | "mint" | "lemon" | "lavender";
  actions?: React.ReactNode;
}) {
  const tints = {
    brand: "bg-brand-soft text-brand",
    pink: "bg-pink-soft text-pink",
    mint: "bg-mint-soft text-mint",
    lemon: "bg-lemon-soft text-lemon",
    lavender: "bg-lavender-soft text-lavender",
  };
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tints[tint]}`}
          >
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
