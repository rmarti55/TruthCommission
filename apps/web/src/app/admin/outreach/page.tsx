import Link from "next/link";
import { AdminNav } from "../admin-nav";
import { requireAdminPage } from "@/lib/require-admin";
import { getDb } from "@/lib/db";
import { outreachSends } from "@truth-commission/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminOutreachHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  await requireAdminPage();
  const db = getDb();
  const params = await searchParams;

  let sends: Array<typeof outreachSends.$inferSelect> = [];
  if (db) {
    sends = await db.select().from(outreachSends).orderBy(desc(outreachSends.sentAt)).limit(100);
  }

  return (
    <>
      <AdminNav current="/admin/outreach" />
      <main className="mx-auto px-[var(--margin-page)] py-10" style={{ maxWidth: "72rem" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-text">Sent history</h1>
            <p className="mt-2 text-muted">Audit log of manual outreach emails.</p>
          </div>
          <Link href="/admin/outreach/new" className="btn-secondary text-sm">
            Compose new
          </Link>
        </div>

        {params.sent === "1" && (
          <p className="mt-4 text-sm text-accent">Outreach send completed.</p>
        )}

        <div className="panel mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-normal">Sent at</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Subject</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {sends.map((send) => (
                <tr key={send.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 text-muted">{send.sentAt.toISOString()}</td>
                  <td className="px-4 py-3 text-text">{send.email}</td>
                  <td className="px-4 py-3 text-muted">{send.subject}</td>
                  <td className="px-4 py-3 text-muted">
                    {send.success ? "Sent" : `Failed: ${send.errorMessage ?? "unknown"}`}
                  </td>
                </tr>
              ))}
              {sends.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No outreach emails sent yet.
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
