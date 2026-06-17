import Link from "next/link";
import { AdminNav } from "../../admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { contactEmails, contacts, organizations } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { fillOutreachTemplate } from "@/lib/outreach-email";
import { sendOutreachAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminOutreachNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPage();
  const db = getDb();
  const params = await searchParams;

  let approved: Array<{
    id: string;
    email: string;
    contactName: string;
    orgName: string | null;
  }> = [];

  if (db) {
    approved = await db
      .select({
        id: contactEmails.id,
        email: contactEmails.email,
        contactName: contacts.name,
        orgName: organizations.name,
      })
      .from(contactEmails)
      .innerJoin(contacts, eq(contactEmails.contactId, contacts.id))
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .where(eq(contactEmails.status, "approved"));
  }

  const defaultBody = fillOutreachTemplate(env.appUrl());

  return (
    <>
      <AdminNav current="/admin/outreach/new" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <h1 className="font-display text-3xl text-text">Compose outreach</h1>
        <p className="mt-2 max-w-prose text-muted">
          Select approved contacts and send a manual update. Each recipient receives an individual
          email.
        </p>

        {params.error === "no-recipients" && (
          <p className="mt-4 text-sm text-accent">Select at least one recipient.</p>
        )}

        {approved.length === 0 ? (
          <div className="panel mt-8 p-6">
            <p className="text-muted">No approved contacts yet.</p>
            <Link href="/admin/contacts?status=discovered" className="text-link mt-4 inline-block text-sm">
              Review discovered contacts →
            </Link>
          </div>
        ) : (
          <form action={sendOutreachAction} className="mt-8 space-y-8">
            <section className="panel p-6">
              <h2 className="font-display text-xl text-text">Recipients ({approved.length} approved)</h2>
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
                {approved.map((row) => (
                  <label key={row.id} className="flex items-start gap-3">
                    <input type="checkbox" name="emailIds" value={row.id} className="mt-1" />
                    <span>
                      <span className="text-text">{row.email}</span>
                      <span className="mt-0.5 block text-muted">
                        {row.contactName}
                        {row.orgName ? ` · ${row.orgName}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="panel space-y-4 p-6">
              <div>
                <label htmlFor="subject" className="mb-1 block text-sm text-muted">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  defaultValue="New Truth Commission materials published"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label htmlFor="body" className="mb-1 block text-sm text-muted">
                  Message
                </label>
                <textarea
                  id="body"
                  name="body"
                  rows={12}
                  defaultValue={defaultBody}
                  className="input-field w-full font-mono text-sm"
                />
              </div>
              <button type="submit" className="btn-secondary">
                Send outreach
              </button>
            </section>
          </form>
        )}
      </main>
    </>
  );
}
