import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentWarning } from "@/components/ui/content-warning";
import { PageLayout } from "@/components/ui/page-layout";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { getDb } from "@/lib/db";
import { artifacts } from "@truth-commission/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.slug, slug))
    .limit(1);

  if (!artifact) notFound();

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const isMeeting = artifact.type === "meeting_transcript";
  const recipient = String(metadata.recipient ?? artifact.title);
  const complianceDeadline = String(metadata.complianceDeadline ?? "");
  const issuedDate = String(metadata.issuedDate ?? "");
  const meetingDate = String(metadata.meetingDate ?? "");
  const manifestId = String(metadata.manifestId ?? "");
  const contentWarning = Boolean(metadata.contentWarning);
  const requestedRecordTypes = Array.isArray(metadata.requestedRecordTypes)
    ? (metadata.requestedRecordTypes as string[])
    : [];
  const pdfUrl = String(metadata.cdnUrl ?? artifact.blobUrl ?? artifact.sourceUrl);
  const title = isMeeting ? artifact.title : recipient;

  return (
    <PageLayout
      header={
        <SubPageHeader
          breadcrumb={{ href: "/artifacts", label: "Archive" }}
          title={title}
          backHref="/artifacts"
        />
      }
    >
      <main className="max-w-3xl py-10 md:py-12">
        {contentWarning ? (
          <ContentWarning>
            Content warning: this material includes discussion of sexual assault and
            survivor testimony.
          </ContentWarning>
        ) : null}

        {isMeeting && manifestId ? (
          <p className={contentWarning ? "mt-6" : undefined}>
            <Link href={`/meetings/${manifestId}`} className="text-link">
              Open meeting page with video and timestamped transcript
            </Link>
          </p>
        ) : null}

        <dl className="panel mt-8 grid gap-4 sm:grid-cols-2">
          {issuedDate ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Issued
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{issuedDate}</dd>
            </div>
          ) : null}
          {meetingDate ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Meeting date
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{meetingDate}</dd>
            </div>
          ) : null}
          {complianceDeadline ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Compliance deadline
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{complianceDeadline}</dd>
            </div>
          ) : null}
          {!isMeeting ? (
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Original PDF
              </dt>
              <dd className="mt-1">
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-link">
                  View source document
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        {!isMeeting ? (
          <section className="mt-12">
            <h2 className="text-lg tracking-[-0.015em]">Summary</h2>
            {artifact.summaryLong ? (
              <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-muted">
                {artifact.summaryLong}
              </p>
            ) : (
              <p className="mt-3 font-sans text-sm text-muted">
                AI summary is not available yet. See requested record types and full
                extracted text below.
              </p>
            )}
          </section>
        ) : artifact.summaryLong ? (
          <section className="mt-12">
            <h2 className="text-lg tracking-[-0.015em]">Summary</h2>
            <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-muted">
              {artifact.summaryLong}
            </p>
          </section>
        ) : null}

        {requestedRecordTypes.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg tracking-[-0.015em]">Requested record types</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm text-muted">
              {requestedRecordTypes.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {artifact.fullText ? (
          <details className="panel mt-12">
            <summary className="cursor-pointer text-lg tracking-[-0.015em]">
              {isMeeting ? "Full transcript text" : "Full extracted text"}
            </summary>
            <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-xs leading-6 text-muted">
              {artifact.fullText}
            </pre>
          </details>
        ) : null}
      </main>
    </PageLayout>
  );
}
