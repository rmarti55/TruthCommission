import Link from "next/link";

type StatTileProps = {
  label: string;
  value: string;
  highlight?: boolean;
  href?: string;
};

export function StatTile({ label, value, highlight = false, href }: StatTileProps) {
  return (
    <div
      className={`relative rounded-sm border border-border bg-surface p-4 ${
        href ? "transition-base hover:border-border-strong hover:bg-surface-muted" : ""
      }`}
    >
      {href ? (
        <Link
          href={href}
          className="absolute inset-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={`${label}: ${value}`}
        />
      ) : null}
      <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 text-2xl leading-none tracking-[-0.02em] ${
          highlight ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
