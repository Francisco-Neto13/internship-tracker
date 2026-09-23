export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-1 text-[11px] font-medium tracking-[0.18em] text-navy-900/45 uppercase">{eyebrow}</p>
      )}
      <h1 className="font-display text-2xl font-semibold text-navy-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-navy-900/60">{description}</p>}
    </div>
  );
}
