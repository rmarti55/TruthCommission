import { ReactNode } from "react";
import { PrimaryNav } from "@/components/ui/header-nav";

type SiteHeaderProps = {
  eyebrow: string;
  title: string;
  badge?: string;
  trailing?: ReactNode;
  current?: string;
};

export function SiteHeader({
  eyebrow,
  title,
  badge,
  trailing,
  current,
}: SiteHeaderProps) {
  return (
    <header className="border-b border-border">
      <div
        className="mx-auto grid grid-cols-1 items-start gap-6 px-[var(--margin-page)] py-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:py-12"
        style={{ maxWidth: "72rem" }}
      >
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-2xl text-2xl leading-[1.1] tracking-[-0.025em] md:text-3xl">
            {title}
          </h1>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end md:pt-1">
          <PrimaryNav current={current} />
          {badge ? (
            <span className="rounded-sm border border-border px-3 py-1 font-sans text-xs text-muted">
              {badge}
            </span>
          ) : null}
          {trailing}
        </div>
      </div>
    </header>
  );
}
