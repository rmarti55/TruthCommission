import Link from "next/link";
import { logoutAction } from "./actions";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/outreach/new", label: "Compose outreach" },
  { href: "/admin/outreach", label: "Sent history" },
];

export function AdminNav({ current }: { current?: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div
        className="mx-auto flex flex-wrap items-center justify-between gap-4 px-[var(--margin-page)] py-4"
        style={{ maxWidth: "72rem" }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Admin</p>
          <Link href="/admin" className="font-display text-xl text-text">
            Stakeholder outreach
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-base ${
                current === link.href ? "text-accent" : "text-muted hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/" className="text-sm text-muted transition-base hover:text-text">
            Public site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary text-sm">
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
