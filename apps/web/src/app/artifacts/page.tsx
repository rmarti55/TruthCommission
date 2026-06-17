import Link from "next/link";
import { getDb } from "@/lib/db";
import { artifacts } from "@truth-commission/db";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const query = params.q?.trim().toLowerCase() ?? "";
  const typeFilter = params.type === "subpoena" ? "subpoena" : undefined;

  const rows =
    db === null
      ? []
      : await db
          .select({
            slug: artifacts.slug,
            title: artifacts.title,
            type: artifacts.type,
            publishedAt: artifacts.publishedAt,
            summaryShort: artifacts.summaryShort,
            metadata: artifacts.metadata,
          })
          .from(artifacts)
          .where(
            typeFilter
              ? and(eq(artifacts.type, typeFilter), eq(artifacts.status, "published"))
              : eq(artifacts.status, "published"),
          )
          .orderBy(desc(artifacts.publishedAt));

  const filtered = rows.filter((row) => {
    if (!query) return true;
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const recipient = String(metadata.recipient ?? "");
    return (
      row.title.toLowerCase().includes(query) ||
      recipient.toLowerCase().includes(query) ||
      row.summaryShort?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/" className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
              NM Truth Commission Tracker
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
          </div>
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <form className="mb-8 flex flex-wrap gap-3" action="/artifacts" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search subpoenas..."
            className="min-w-[240px] flex-1 rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-500"
          />
          <input type="hidden" name="type" value="subpoena" />
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950"
          >
            Search
          </button>
        </form>

        {db === null ? (
          <p className="text-stone-400">Database not configured. Set POSTGRES_URL to load the archive.</p>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400">No published artifacts yet.</p>
        ) : (
          <ol className="space-y-4">
            {filtered.map((row) => {
              const metadata = (row.metadata ?? {}) as Record<string, unknown>;
              const recipient = String(metadata.recipient ?? row.title);
              const deadline = String(metadata.complianceDeadline ?? "");

              return (
                <li
                  key={row.slug}
                  className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5 transition hover:border-amber-500/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-amber-300/80">{row.type}</p>
                      <h2 className="mt-1 text-lg font-medium">
                        <Link href={`/artifacts/${row.slug}`} className="hover:text-amber-200">
                          {recipient}
                        </Link>
                      </h2>
                      {deadline ? (
                        <p className="mt-1 text-sm text-stone-400">Compliance due {deadline}</p>
                      ) : null}
                    </div>
                    {row.publishedAt ? (
                      <time className="text-xs text-stone-500">
                        {row.publishedAt.toISOString().slice(0, 10)}
                      </time>
                    ) : null}
                  </div>
                  {row.summaryShort ? (
                    <p className="mt-3 text-sm leading-6 text-stone-300">{row.summaryShort}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
