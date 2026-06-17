import Link from "next/link";

type LinkCardProps = {
  title: string;
  href: string;
  detail: string;
};

export function LinkCard({ title, href, detail }: LinkCardProps) {
  const external = href.startsWith("http");

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="transition-base block rounded-sm border border-border bg-surface p-5 hover:border-border-strong hover:bg-surface-muted"
    >
      <h3 className="text-lg leading-snug tracking-[-0.015em]">{title}</h3>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{detail}</p>
    </Link>
  );
}
