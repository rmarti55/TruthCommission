import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MeetingDetailContent,
  type TranscriptParagraph,
} from "@/components/meeting-detail-content";
import { PageLayout } from "@/components/ui/page-layout";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { getDb } from "@/lib/db";
import { documentLinksFromMetadata } from "@/lib/meeting-helpers";
import { artifacts, captionSegments, meetings } from "@truth-commission/db";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function UpcomingMeetingContent({
  meeting,
  agendaItems,
  documentLinks,
  revisedDate,
}: {
  meeting: {
    title: string;
    meetingDate: Date | null;
    metadata: {
      format?: string;
      startTime?: string;
      sourceNotes?: string;
    } | null;
  };
  agendaItems: string[];
  documentLinks: Array<{ label: string; url: string }>;
  revisedDate?: string;
}) {
  const metadata = meeting.metadata;

  return (
    <>
      <dl className="panel grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {meeting.meetingDate ? (
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Meeting date
            </dt>
            <dd className="mt-1 font-sans text-sm text-text">
              {meeting.meetingDate.toISOString().slice(0, 10)}
            </dd>
          </div>
        ) : null}
        {metadata?.startTime ? (
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Start time
            </dt>
            <dd className="mt-1 font-sans text-sm text-text">{metadata.startTime}</dd>
          </div>
        ) : null}
        {metadata?.format ? (
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Format
            </dt>
            <dd className="mt-1 font-sans text-sm capitalize text-text">{metadata.format}</dd>
          </div>
        ) : null}
        {revisedDate ? (
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Agenda revised
            </dt>
            <dd className="mt-1 font-sans text-sm text-text">{revisedDate}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">Status</dt>
          <dd className="mt-1 font-sans text-sm text-text">Upcoming — no recording yet</dd>
        </div>
      </dl>

      {metadata?.sourceNotes ? (
        <section className="panel">
          <h2 className="text-lg tracking-[-0.015em]">Schedule note</h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-muted">
            {metadata.sourceNotes}
          </p>
        </section>
      ) : null}

      {agendaItems.length > 0 ? (
        <section className="panel">
          <h2 className="text-lg tracking-[-0.015em]">Agenda</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 font-sans text-sm">
            {agendaItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {documentLinks.length > 0 ? (
        <section className="panel">
          <h2 className="text-lg tracking-[-0.015em]">Related documents</h2>
          <ul className="mt-3 space-y-2 font-sans text-sm">
            {documentLinks.map((doc) => (
              <li key={doc.url}>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-link">
                  {doc.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ externalId: string }>;
}) {
  const { externalId } = await params;
  const db = getDb();
  if (!db) notFound();

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.externalId, externalId))
    .limit(1);

  if (!meeting) notFound();

  const [transcript] = await db
    .select()
    .from(artifacts)
    .where(
      and(
        eq(artifacts.meetingId, meeting.id),
        eq(artifacts.type, "meeting_transcript"),
      ),
    )
    .limit(1);

  const [agenda] = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.meetingId, meeting.id), eq(artifacts.type, "agenda")))
    .limit(1);

  if (!transcript) {
    const agendaMeta = (agenda?.metadata ?? {}) as Record<string, unknown>;
    const agendaItems = Array.isArray(agendaMeta.agendaItems)
      ? (agendaMeta.agendaItems as string[])
      : [];
    const documentLinks = documentLinksFromMetadata(meeting.metadata);

    if (agenda?.sourceUrl && !documentLinks.some((link) => link.url === agenda.sourceUrl)) {
      documentLinks.unshift({ label: "Agenda PDF (nmlegis)", url: agenda.sourceUrl });
    }

    return (
      <PageLayout
        header={
          <SubPageHeader
            breadcrumb={{ href: "/meetings", label: "Meetings" }}
            title={meeting.title}
            backHref="/meetings#upcoming"
            backLabel="Upcoming"
            current="/meetings"
          />
        }
      >
        <main className="space-y-12 py-10 md:py-12">
          <UpcomingMeetingContent
            meeting={meeting}
            agendaItems={agendaItems}
            documentLinks={documentLinks}
            revisedDate={
              typeof agendaMeta.revisedDate === "string" ? agendaMeta.revisedDate : undefined
            }
          />
          {agenda ? (
            <p className="font-sans text-xs text-muted">
              <Link href={`/artifacts/${agenda.slug}`} className="text-link">
                View agenda archive entry
              </Link>
            </p>
          ) : null}
        </main>
      </PageLayout>
    );
  }

  const segments = await db
    .select({
      sequence: captionSegments.sequence,
      beginAt: captionSegments.beginAt,
      content: captionSegments.content,
    })
    .from(captionSegments)
    .where(eq(captionSegments.artifactId, transcript.id))
    .orderBy(asc(captionSegments.sequence));

  const metadata = (transcript.metadata ?? {}) as Record<string, unknown>;
  const streamUrl = String(metadata.streamUrl ?? meeting.streamUrl ?? transcript.blobUrl ?? "");
  const startTime = String(metadata.startTime ?? meeting.meetingDate?.toISOString() ?? "");
  const endTime = String(metadata.endTime ?? "");
  const harmonyEventId = String(metadata.harmonyEventId ?? meeting.harmonyEventId ?? "");
  const segmentCount = Number(metadata.segmentCount ?? segments.length);
  const contentWarning = Boolean(metadata.contentWarning);
  const sourceUrl = transcript.sourceUrl;
  const paragraphs = Array.isArray(metadata.paragraphs)
    ? (metadata.paragraphs as TranscriptParagraph[])
    : [];
  const documents = (metadata.documents ?? {}) as Record<string, unknown>;

  let durationLabel = "";
  if (metadata.startTime && metadata.endTime) {
    const startMs = new Date(String(metadata.startTime)).getTime();
    const endMs = new Date(String(metadata.endTime)).getTime();
    if (endMs > startMs) {
      durationLabel = formatDuration((endMs - startMs) / 1000);
    }
  }

  const documentLinks = documentLinksFromMetadata(meeting.metadata, documents);

  return (
    <PageLayout
      header={
        <SubPageHeader
          breadcrumb={{ href: "/meetings", label: "Meetings" }}
          title={meeting.title}
          backHref="/meetings"
          current="/meetings"
        />
      }
    >
      <main className="space-y-12 py-10 md:py-12">
        <dl className="panel grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meeting.meetingDate ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Meeting date
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">
                {meeting.meetingDate.toISOString().slice(0, 10)}
              </dd>
            </div>
          ) : null}
          {durationLabel ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Duration
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{durationLabel}</dd>
            </div>
          ) : null}
          {harmonyEventId ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Harmony event
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{harmonyEventId}</dd>
            </div>
          ) : null}
          {segmentCount > 0 ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Caption segments
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">{segmentCount}</dd>
            </div>
          ) : null}
          {startTime ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Started
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">
                {new Date(startTime).toLocaleString()}
              </dd>
            </div>
          ) : null}
          {endTime ? (
            <div>
              <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
                Ended
              </dt>
              <dd className="mt-1 font-sans text-sm text-text">
                {new Date(endTime).toLocaleString()}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="font-sans text-xs uppercase tracking-[0.12em] text-muted">
              Primary sources
            </dt>
            <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm">
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-link">
                Harmony recording page
              </a>
              <Link href={`/artifacts/${transcript.slug}`} className="text-link">
                Archive entry
              </Link>
              {streamUrl ? (
                <a href={streamUrl} target="_blank" rel="noreferrer" className="text-link">
                  HLS stream (m3u8)
                </a>
              ) : null}
            </dd>
          </div>
        </dl>

        {documentLinks.length > 0 ? (
          <section className="panel">
            <h2 className="text-lg tracking-[-0.015em]">Related documents</h2>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {documentLinks.map((doc) => (
                <li key={doc.url}>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-link">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <MeetingDetailContent
          streamUrl={streamUrl}
          startTime={startTime}
          segments={segments.map((segment) => ({
            sequence: segment.sequence,
            beginAt: segment.beginAt.toISOString(),
            content: segment.content,
          }))}
          paragraphs={paragraphs}
          contentWarning={contentWarning}
          summaryShort={transcript.summaryShort}
          summaryLong={transcript.summaryLong}
          fullText={transcript.fullText}
        />
      </main>
    </PageLayout>
  );
}
