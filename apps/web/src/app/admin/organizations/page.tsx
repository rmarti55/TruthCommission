import Link from "next/link";
import { AdminNav } from "../admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import { contactEmails, contacts, organizations } from "@truth-commission/db";
import { count, eq } from "drizzle-orm";
import { getStakeholderOrganizations } from "@truth-commission/ingest";
import { recrawlOrganizationAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ recrawled?: string }>;
}) {
  await requireAdminPage();
  const db = getDb();
  const params = await searchParams;
  const seeds = getStakeholderOrganizations();

  let orgRows: Array<{
    id: string;
    externalId: string | null;
    name: string;
    category: string;
    website: string | null;
    notes: string | null;
    emailCount: number;
  }> = [];

  if (db) {
    const orgs = await db.select().from(organizations).orderBy(organizations.name);

    for (const org of orgs) {
      const orgContacts = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.organizationId, org.id));

      let emailCount = 0;
      for (const contact of orgContacts) {
        const [result] = await db
          .select({ value: count() })
          .from(contactEmails)
          .where(eq(contactEmails.contactId, contact.id));
        emailCount += result?.value ?? 0;
      }

      orgRows.push({
        id: org.id,
        externalId: org.externalId,
        name: org.name,
        category: org.category,
        website: org.website,
        notes: org.notes,
        emailCount,
      });
    }
  }

  const seedIds = new Set(seeds.map((s) => s.id));

  return (
    <>
      <AdminNav current="/admin/organizations" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <h1 className="font-display text-3xl text-text">Organizations</h1>
        <p className="mt-2 max-w-prose text-muted">
          Stakeholder organizations seeded from recon and discovered during ingestion.
        </p>

        {params.recrawled === "1" && (
          <p className="mt-4 text-sm text-accent">Organization re-crawl completed.</p>
        )}

        <div className="panel mt-8 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-normal">Organization</th>
                <th className="px-4 py-3 font-normal">Category</th>
                <th className="px-4 py-3 font-normal">Website</th>
                <th className="px-4 py-3 font-normal">Emails</th>
                <th className="px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgRows.map((org) => (
                <tr key={org.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="text-text">{org.name}</p>
                    {org.externalId && (
                      <p className="mt-1 text-xs text-muted">{org.externalId}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{org.category}</td>
                  <td className="px-4 py-3 text-muted">
                    {org.website ? (
                      <a href={org.website} className="text-link break-all" target="_blank" rel="noreferrer">
                        {org.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{org.emailCount}</td>
                  <td className="px-4 py-3">
                    {org.externalId && seedIds.has(org.externalId) ? (
                      <form action={recrawlOrganizationAction}>
                        <input type="hidden" name="externalId" value={org.externalId} />
                        <button type="submit" className="text-link text-sm">
                          Re-crawl
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">No crawl seed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="panel mt-8 p-6">
          <h2 className="font-display text-xl text-text">Crawl seeds not yet in database</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {seeds
              .filter((seed) => !orgRows.some((org) => org.externalId === seed.id))
              .map((seed) => (
                <li key={seed.id}>
                  {seed.name} — run discovery to seed
                </li>
              ))}
          </ul>
        </section>
      </main>
    </>
  );
}
