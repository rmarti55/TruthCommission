import Link from "next/link";
import { AdminNav } from "../admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import { contactEmails, contacts, organizations } from "@truth-commission/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage();
  const db = getDb();
  const params = await searchParams;
  const statusFilter = params.status;
  const query = params.q?.trim();

  const statuses = ["discovered", "pending_review", "approved", "rejected"] as const;

  let rows: Array<{
    id: string;
    email: string;
    status: string;
    confidence: number;
    sourceType: string;
    discoveredAt: Date;
    contactName: string;
    orgName: string | null;
    orgCategory: string | null;
  }> = [];

  if (db) {
    const baseQuery = db
      .select({
        id: contactEmails.id,
        email: contactEmails.email,
        status: contactEmails.status,
        confidence: contactEmails.confidence,
        sourceType: contactEmails.sourceType,
        discoveredAt: contactEmails.discoveredAt,
        contactName: contacts.name,
        orgName: organizations.name,
        orgCategory: organizations.category,
      })
      .from(contactEmails)
      .innerJoin(contacts, eq(contactEmails.contactId, contacts.id))
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .orderBy(desc(contactEmails.discoveredAt))
      .limit(200);

    const all = await baseQuery;

    rows = all.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          row.email.toLowerCase().includes(q) ||
          row.contactName.toLowerCase().includes(q) ||
          (row.orgName?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }

  return (
    <>
      <AdminNav current="/admin/contacts" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <h1 className="font-display text-3xl text-text">Contacts</h1>

        <form className="mt-6 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search email, name, org…"
            className="input-field min-w-[240px] flex-1"
          />
          <select name="status" defaultValue={statusFilter ?? ""} className="input-field">
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">
            Filter
          </button>
        </form>

        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Contact</th>
                <th className="px-4 py-3 font-normal">Organization</th>
                <th className="px-4 py-3 font-normal">Source</th>
                <th className="px-4 py-3 font-normal">Confidence</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/contacts/${row.id}`} className="text-link">
                      {row.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.contactName}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.orgName ?? "—"}
                    {row.orgCategory ? (
                      <span className="mt-1 block text-xs">{row.orgCategory}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.sourceType}</td>
                  <td className="px-4 py-3 text-muted">{row.confidence}</td>
                  <td className="px-4 py-3 text-muted">{row.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No contacts found. Run discovery to populate this list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
