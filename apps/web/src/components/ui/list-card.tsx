import NextLink from "next/link";
import { ReactNode } from "react";

type ListCardProps = {
  href?: string;
  external?: boolean;
  eyebrow?: string;
  title: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
  aside?: ReactNode;
};

export function ListCard({
  href,
  external,
  eyebrow,
  title,
  meta,
  detail,
  aside,
}: ListCardProps) {
  const titleNode =
    href && typeof title === "string" ? (
      <NextLink
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="transition-base hover:text-accent"
      >
        {title}
      </NextLink>
    ) : (
      title
    );

  return (
    <li className="transition-base rounded-sm border border-border bg-surface p-5 hover:border-border-strong hover:bg-surface-muted">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-lg leading-snug tracking-[-0.015em]">{titleNode}</h2>
          {meta}
        </div>
        {aside}
      </div>
      {detail ? (
        <p className="mt-3 font-sans text-sm leading-relaxed text-body">{detail}</p>
      ) : null}
    </li>
  );
}
