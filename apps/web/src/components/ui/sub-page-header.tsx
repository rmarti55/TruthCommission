import Link from "next/link";
import { ReactNode } from "react";

type SubPageHeaderProps = {
  breadcrumb: { href: string; label: string };
  title: string;
  backHref: string;
  backLabel?: string;
  trailing?: ReactNode;
};

export function SubPageHeader({
  breadcrumb,
  title,
  backHref,
  backLabel = "Back",
  trailing,
}: SubPageHeaderProps) {
  return (
    <header className="border-b border-border">
      <div
        className="mx-auto flex flex-wrap items-start justify-between gap-4 px-[var(--margin-page)] py-8 md:py-10"
        style={{ maxWidth: "72rem" }}
      >
        <div>
          <Link
            href={breadcrumb.href}
            className="font-sans text-xs uppercase tracking-[0.18em] text-muted transition-base hover:text-text"
          >
            {breadcrumb.label}
          </Link>
          <h1 className="mt-2 max-w-3xl text-2xl leading-[1.1] tracking-[-0.025em] md:text-3xl">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {trailing}
          <Link
            href={backHref}
            className="font-sans text-sm text-muted transition-base hover:text-text"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
