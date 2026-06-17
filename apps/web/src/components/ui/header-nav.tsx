import Link from "next/link";
import { ReactNode } from "react";

export const PRIMARY_NAV_LINKS = [
  { href: "/artifacts", label: "Archive" },
  { href: "/meetings", label: "Meetings" },
  { href: "/committee", label: "Commission" },
] as const;

type PrimaryNavProps = {
  current?: string;
};

export function PrimaryNav({ current }: PrimaryNavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-4">
      {PRIMARY_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-sans text-sm transition-base ${
            current === link.href ? "text-accent" : "text-muted hover:text-text"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

type ContextualNavProps = {
  breadcrumb?: { href: string; label: string };
  backHref?: string;
  backLabel?: string;
  trailing?: ReactNode;
};

export function ContextualNav({
  breadcrumb,
  backHref,
  backLabel = "Back",
  trailing,
}: ContextualNavProps) {
  if (!breadcrumb && !backHref && !trailing) return null;

  return (
    <nav className="flex flex-wrap items-center gap-4">
      {breadcrumb ? (
        <Link
          href={breadcrumb.href}
          className="font-sans text-xs uppercase tracking-[0.18em] text-muted transition-base hover:text-text"
        >
          {breadcrumb.label}
        </Link>
      ) : null}
      {backHref ? (
        <Link
          href={backHref}
          className="font-sans text-sm text-muted transition-base hover:text-text"
        >
          {backLabel}
        </Link>
      ) : null}
      {trailing}
    </nav>
  );
}
