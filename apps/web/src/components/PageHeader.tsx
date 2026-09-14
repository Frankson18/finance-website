export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-3 sm:px-5">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-lg font-bold text-ink">{title}</h1>
        {subtitle && (
          <span className="hidden truncate text-xs text-muted md:block">
            {subtitle}
          </span>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </header>
  );
}

export function PageBody({
  children,
  scroll = true,
  className,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div
      className={
        (scroll ? "overflow-y-auto " : "overflow-hidden ") +
        "min-h-0 flex-1 " +
        (className ?? "")
      }
    >
      {children}
    </div>
  );
}
