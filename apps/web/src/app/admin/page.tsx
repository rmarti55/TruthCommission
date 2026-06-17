import Link from "next/link";
import { AdminNav } from "./admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import {
  contactEmails,
  contacts,
  discoveryRuns,
  organizations,
  outreachSends,
} from "@truth-commission/db";
import { count, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const db = getDb();

  const empty = {
    discovered: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    orgs: 0,
    contacts: 0,
    sends: 0,
  };

  if (!db) {
    return (
      <>
        <AdminNav current="/admin" />
        <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
          <p className="text-muted">Database not configured.</p>
        </main>
      </>
    );
  }

  const statusCounts = await db
    .select({ status: contactEmails.status, value: count() })
    .from(contactEmails)
    .groupBy(contactEmails.status);

  const stats = { ...empty };
  for (const row of statusCounts) {
    if (row.status === "discovered") stats.discovered = row.value;
    if (row.status === "pending_review") stats.pending = row.value;
    if (row.status === "approved") stats.approved = row.value;
    if (row.status === "rejected") stats.rejected = row.value;
  }

  const [[orgCount], [contactCount], [sendCount]] = await Promise.all([
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(contacts),
    db.select({ value: count() }).from(outreachSends),
  ]);

  stats.orgs = orgCount?.value ?? 0;
  stats.contacts = contactCount?.value ?? 0;
  stats.sends = sendCount?.value ?? 0;

  const [lastRun] = await db
    .select()
    .from(discoveryRuns)
    .orderBy(desc(discoveryRuns.startedAt))
    .limit(1);

  const recentEmails = await db
    .select({
      id: contactEmails.id,
      email: contactEmails.email,
      status: contactEmails.status,
      confidence: contactEmails.confidence,
      discoveredAt: contactEmails.discoveredAt,
      contactName: contacts.name,
      orgName: organizations.name,
    })
    .from(contactEmails)
    .innerJoin(contacts, eq(contactEmails.contactId, contacts.id))
    .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
    .orderBy(desc(contactEmails.discoveredAt))
    .limit(8);

  return (
    <>
      <AdminNav current="/admin" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <h1 className="font-display text-3xl text-text">Dashboard</h1>
        <p className="mt-2 max-w-prose text-muted">
          Review discovered stakeholder emails before sending manual outreach updates.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Discovered", value: stats.discovered },
            { label: "Pending review", value: stats.pending },
            { label: "Approved", value: stats.approved },
            { label: "Organizations", value: stats.orgs },
          ].map((tile) => (
            <div key={tile.label} className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{tile.label}</p>
              <p className="mt-1 font-display text-3xl text-text">{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="panel p-6">
            <h2 className="font-display text-xl text-text">Last discovery run</h2>
            {lastRun ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Started</dt>
                  <dd>{lastRun.startedAt.toISOString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Success</dt>
                  <dd>{lastRun.success ? "Yes" : "No"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted">No discovery runs yet.</p>
            )}
            <p className="mt-4 text-sm text-muted">
              Run locally: <code className="text-text">npm run discover:contacts -w web</code>
            </p>
          </section>

          <section className="panel p-6">
            <h2 className="font-display text-xl text-text">Outreach</h2>
            <p className="mt-2 text-sm text-muted">{stats.sends} emails sent manually.</p>
            <Link href="/admin/outreach/new" className="text-link mt-4 inline-block text-sm">
              Compose new outreach →
            </Link>
          </section>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-text">Recently discovered</h2>
            <Link href="/admin/contacts" className="text-link text-sm">
              View all
            </Link>
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Contact</th>
                  <th className="px-4 py-3 font-normal">Organization</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEmails.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/contacts/${row.id}`} className="text-link">
                        {row.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.contactName}</td>
                    <td className="px-4 py-3 text-muted">{row.orgName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
