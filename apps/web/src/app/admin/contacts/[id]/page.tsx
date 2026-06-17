import Link from "next/link";
import { AdminNav } from "../../admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import {
  artifacts,
  contactEmails,
  contacts,
  organizations,
} from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { markPendingReviewAction, updateEmailStatusAction } from "../../actions";
import type { EmailProvenanceEntry } from "@truth-commission/db";

export const dynamic = "force-dynamic";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const db = getDb();

  if (!db) {
    return (
      <>
        <AdminNav current="/admin/contacts" />
        <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
          <p className="text-muted">Database not configured.</p>
        </main>
      </>
    );
  }

  const [row] = await db
    .select({
      email: contactEmails,
      contact: contacts,
      org: organizations,
    })
    .from(contactEmails)
    .innerJoin(contacts, eq(contactEmails.contactId, contacts.id))
    .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
    .where(eq(contactEmails.id, id))
    .limit(1);

  if (!row) {
    return (
      <>
        <AdminNav current="/admin/contacts" />
        <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
          <p className="text-muted">Contact not found.</p>
          <Link href="/admin/contacts" className="text-link mt-4 inline-block text-sm">
            ← Back to contacts
          </Link>
        </main>
      </>
    );
  }

  let artifactTitle: string | null = null;
  if (row.email.artifactId) {
    const [artifact] = await db
      .select({ title: artifacts.title })
      .from(artifacts)
      .where(eq(artifacts.id, row.email.artifactId))
      .limit(1);
    artifactTitle = artifact?.title ?? null;
  }

  const provenance = (row.email.provenance as EmailProvenanceEntry[] | null) ?? [];

  return (
    <>
      <AdminNav current="/admin/contacts" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <Link href="/admin/contacts" className="text-link text-sm">
          ← Back to contacts
        </Link>
        <h1 className="mt-4 font-display text-3xl text-text">{row.email.email}</h1>
        <p className="mt-2 text-muted">
          {row.contact.name}
          {row.contact.title ? ` · ${row.contact.title}` : ""}
          {row.org ? ` · ${row.org.name}` : ""}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="panel p-6">
            <h2 className="font-display text-xl text-text">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1">{row.email.status}</dd>
              </div>
              <div>
                <dt className="text-muted">Confidence</dt>
                <dd className="mt-1">{row.email.confidence}</dd>
              </div>
              <div>
                <dt className="text-muted">Source type</dt>
                <dd className="mt-1">{row.email.sourceType}</dd>
              </div>
              {row.email.sourceUrl && (
                <div>
                  <dt className="text-muted">Source URL</dt>
                  <dd className="mt-1 break-all">
                    <a href={row.email.sourceUrl} className="text-link" target="_blank" rel="noreferrer">
                      {row.email.sourceUrl}
                    </a>
                  </dd>
                </div>
              )}
              {artifactTitle && (
                <div>
                  <dt className="text-muted">Artifact</dt>
                  <dd className="mt-1">{artifactTitle}</dd>
                </div>
              )}
              {row.email.snippet && (
                <div>
                  <dt className="text-muted">Snippet</dt>
                  <dd className="mt-1 max-w-prose text-text">{row.email.snippet}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Discovered</dt>
                <dd className="mt-1">{row.email.discoveredAt.toISOString()}</dd>
              </div>
            </dl>
          </section>

          <section className="panel p-6">
            <h2 className="font-display text-xl text-text">Review</h2>
            <form action={updateEmailStatusAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={row.email.id} />
              <div>
                <label htmlFor="status" className="mb-1 block text-sm text-muted">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={row.email.status}
                  className="input-field w-full"
                >
                  <option value="discovered">discovered</option>
                  <option value="pending_review">pending_review</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div>
                <label htmlFor="adminNotes" className="mb-1 block text-sm text-muted">
                  Admin notes
                </label>
                <textarea
                  id="adminNotes"
                  name="adminNotes"
                  defaultValue={row.email.adminNotes ?? ""}
                  rows={4}
                  className="input-field w-full"
                />
              </div>
              <button type="submit" className="btn-secondary">
                Save review
              </button>
            </form>

            {row.email.status === "discovered" && (
              <form action={markPendingReviewAction} className="mt-4">
                <input type="hidden" name="id" value={row.email.id} />
                <button type="submit" className="text-link text-sm">
                  Mark pending review
                </button>
              </form>
            )}
          </section>
        </div>

        {provenance.length > 0 && (
          <section className="panel mt-6 p-6">
            <h2 className="font-display text-xl text-text">Provenance history</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {provenance.map((entry, index) => (
                <li key={index} className="border-b border-border pb-3 last:border-0">
                  <p className="text-muted">
                    {entry.sourceType} · confidence {entry.confidence ?? "—"} ·{" "}
                    {entry.discoveredAt}
                  </p>
                  {entry.sourceUrl && (
                    <p className="mt-1 break-all">
                      <a href={entry.sourceUrl} className="text-link" target="_blank" rel="noreferrer">
                        {entry.sourceUrl}
                      </a>
                    </p>
                  )}
                  {entry.snippet && <p className="mt-1 text-text">{entry.snippet}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
