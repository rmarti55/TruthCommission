import { ReactNode } from "react";
import { ContextualNav, PrimaryNav } from "@/components/ui/header-nav";

type SubPageHeaderProps = {
  breadcrumb?: { href: string; label: string };
  title: string;
  backHref?: string;
  backLabel?: string;
  trailing?: ReactNode;
  current?: string;
};

export function SubPageHeader({
  breadcrumb,
  title,
  backHref,
  backLabel = "Back",
  trailing,
  current,
}: SubPageHeaderProps) {
  return (
    <header className="border-b border-border">
      <div
        className="mx-auto flex flex-wrap items-start justify-between gap-4 px-[var(--margin-page)] py-8 md:py-10"
        style={{ maxWidth: "72rem" }}
      >
        <h1 className="max-w-3xl text-2xl leading-[1.1] tracking-[-0.025em] md:text-3xl">
          {title}
        </h1>
        <div className="flex flex-col items-end gap-2 md:gap-3">
          <PrimaryNav current={current} />
          <ContextualNav
            breadcrumb={breadcrumb}
            backHref={backHref}
            backLabel={backLabel}
            trailing={trailing}
          />
        </div>
      </div>
    </header>
  );
}
