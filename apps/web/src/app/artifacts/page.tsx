import { ListCard } from "@/components/ui/list-card";
import { PageLayout } from "@/components/ui/page-layout";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { getDb } from "@/lib/db";
import { SUBPOENA_BATCH_CONTENT_KEY } from "@/lib/summarize-subpoena-batch";
import { artifacts, siteContent } from "@truth-commission/db";
import { and, desc, eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "subpoena", label: "Subpoenas" },
] as const;

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const query = params.q?.trim().toLowerCase() ?? "";
  const typeFilter = TYPE_OPTIONS.some((option) => option.value === params.type)
    ? params.type
    : undefined;

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
            and(
              eq(artifacts.status, "published"),
              ne(artifacts.type, "meeting_transcript"),
              typeFilter ? eq(artifacts.type, typeFilter as "subpoena") : undefined,
            ),
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

  const showSubpoenaBatchOverview =
    typeFilter === "subpoena" ||
    (typeFilter === undefined && rows.some((row) => row.type === "subpoena"));

  let batchSummaryLong: string | null = null;
  if (db && showSubpoenaBatchOverview) {
    const [batchContent] = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.key, SUBPOENA_BATCH_CONTENT_KEY))
      .limit(1);
    batchSummaryLong =
      typeof batchContent?.value?.summaryLong === "string"
        ? batchContent.value.summaryLong
        : null;
  }

  return (
    <PageLayout
      header={
        <SubPageHeader
          breadcrumb={{ href: "/", label: "NM Truth Commission Tracker" }}
          title="Archive"
          backHref="/"
          backLabel="Home"
        />
      }
    >
      <main className="py-10 md:py-12">
        <form className="mb-10 flex flex-wrap gap-3" action="/artifacts" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search archive..."
            className="input-field min-w-[240px] flex-1"
          />
          <select name="type" defaultValue={params.type ?? ""} className="input-field">
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </form>

        {db === null ? (
          <p className="font-sans text-sm text-muted">
            Database not configured. Set POSTGRES_URL to load the archive.
          </p>
        ) : filtered.length === 0 ? (
          <p className="font-sans text-sm text-muted">No published artifacts yet.</p>
        ) : (
          <>
            {showSubpoenaBatchOverview ? (
              <section className="panel mb-10">
                <h2 className="text-lg tracking-[-0.015em]">June 2026 subpoena batch</h2>
                {batchSummaryLong ? (
                  <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-muted">
                    {batchSummaryLong}
                  </p>
                ) : (
                  <p className="mt-3 font-sans text-sm text-muted">
                    Batch summary is not available yet.
                  </p>
                )}
              </section>
            ) : null}

            <ol className="space-y-4">
            {filtered.map((row) => {
              const metadata = (row.metadata ?? {}) as Record<string, unknown>;
              const recipient = String(metadata.recipient ?? row.title);
              const deadline = String(metadata.complianceDeadline ?? "");
              const meetingDate = String(metadata.meetingDate ?? "");
              const href =
                row.type === "meeting_transcript" && metadata.manifestId
                  ? `/meetings/${metadata.manifestId}`
                  : `/artifacts/${row.slug}`;

              return (
                <ListCard
                  key={row.slug}
                  href={href}
                  eyebrow={row.type.replace(/_/g, " ")}
                  title={row.type === "subpoena" ? recipient : row.title}
                  meta={
                    <>
                      {deadline ? (
                        <p className="mt-1 font-sans text-sm text-muted">
                          Compliance due {deadline}
                        </p>
                      ) : null}
                      {meetingDate ? (
                        <p className="mt-1 font-sans text-sm text-muted">
                          Meeting date {meetingDate}
                        </p>
                      ) : null}
                    </>
                  }
                  aside={
                    row.publishedAt ? (
                      <time className="font-sans text-xs text-muted">
                        {row.publishedAt.toISOString().slice(0, 10)}
                      </time>
                    ) : null
                  }
                  detail={row.summaryShort}
                />
              );
            })}
            </ol>
          </>
        )}
      </main>
    </PageLayout>
  );
}
