import Link from "next/link";
import { ListCard } from "@/components/ui/list-card";
import { PageLayout } from "@/components/ui/page-layout";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { getDb } from "@/lib/db";
import {
  formatMeetingMeta,
  loadUpcomingMeetings,
} from "@/lib/meeting-helpers";
import { loadSources } from "@truth-commission/ingest";
import { artifacts, meetings } from "@truth-commission/db";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const sources = loadSources();
  const db = getDb();
  const upcomingMeetings = await loadUpcomingMeetings();

  const rows =
    db === null
      ? []
      : await db
          .select({
            externalId: meetings.externalId,
            title: meetings.title,
            meetingDate: meetings.meetingDate,
            harmonyEventId: meetings.harmonyEventId,
            slug: artifacts.slug,
            summaryShort: artifacts.summaryShort,
            summaryLong: artifacts.summaryLong,
            metadata: artifacts.metadata,
          })
          .from(meetings)
          .leftJoin(
            artifacts,
            and(
              eq(artifacts.meetingId, meetings.id),
              eq(artifacts.type, "meeting_transcript"),
              eq(artifacts.status, "published"),
            ),
          )
          .where(eq(meetings.status, "past"))
          .orderBy(desc(meetings.meetingDate));

  return (
    <PageLayout
      header={
        <SubPageHeader
          title="Meetings"
          backHref="/"
          backLabel="Home"
          current="/meetings"
        />
      }
    >
      <main className="py-10 md:py-12">
        <p className="prose-block max-w-prose">
          Upcoming HISC schedule with agendas and teleconference links, plus past meetings
          with official Harmony recordings, AI summaries, and full searchable captions.
        </p>

        <section id="upcoming" className="mt-12 scroll-mt-24">
          <h2 className="text-lg tracking-[-0.015em]">Upcoming</h2>
          {upcomingMeetings.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-muted">No upcoming meetings scheduled.</p>
          ) : (
            <ol className="mt-6 space-y-4">
              {upcomingMeetings.map((meeting) => (
                <ListCard
                  key={meeting.externalId}
                  href={`/meetings/${meeting.externalId}`}
                  title={meeting.title}
                  meta={
                    <>
                      <p className="mt-1 font-sans text-sm text-muted">
                        {formatMeetingMeta(
                          meeting.meetingDate,
                          meeting.format,
                          meeting.startTime,
                        )}
                      </p>
                      {meeting.agendaItemCount ? (
                        <p className="mt-1 font-sans text-xs text-muted">
                          {meeting.agendaItemCount} agenda items
                        </p>
                      ) : null}
                      {meeting.sourceNotes ? (
                        <p className="mt-1 font-sans text-xs text-muted">{meeting.sourceNotes}</p>
                      ) : null}
                    </>
                  }
                  detail="Agenda, handouts, and teleconference links"
                />
              ))}
            </ol>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-lg tracking-[-0.015em]">Past transcripts</h2>
          {db === null ? (
            <p className="mt-4 font-sans text-sm text-muted">
              Database not configured. Set POSTGRES_URL to load meetings.
            </p>
          ) : rows.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-muted">No meeting transcripts yet.</p>
          ) : (
            <ol className="mt-6 space-y-4">
              {rows.map((row) => {
                const metadata = (row.metadata ?? {}) as Record<string, unknown>;
                const segmentCount = Number(metadata.segmentCount ?? 0);
                const harmonyEventId =
                  row.harmonyEventId ?? String(metadata.harmonyEventId ?? "");

                return (
                  <ListCard
                    key={row.externalId}
                    href={`/meetings/${row.externalId}`}
                    title={row.title}
                    meta={
                      <>
                        {row.meetingDate ? (
                          <p className="mt-1 font-sans text-sm text-muted">
                            {row.meetingDate.toISOString().slice(0, 10)}
                          </p>
                        ) : null}
                        {harmonyEventId ? (
                          <p className="mt-1 font-sans text-xs text-muted">
                            Harmony event {harmonyEventId}
                            {segmentCount > 0 ? ` · ${segmentCount} captions` : ""}
                          </p>
                        ) : null}
                      </>
                    }
                    aside={
                      row.slug ? (
                        <Link
                          href={`/artifacts/${row.slug}`}
                          className="font-sans text-xs text-muted transition-base hover:text-text"
                        >
                          Archive entry
                        </Link>
                      ) : null
                    }
                    detail={row.summaryShort ?? row.summaryLong}
                  />
                );
              })}
            </ol>
          )}
        </section>

        <section className="panel mt-12">
          <h2 className="text-lg tracking-[-0.015em]">Official meeting sources</h2>
          <ul className="mt-3 space-y-2 font-sans text-sm">
            <li>
              <a
                href="https://www.nmtruthcommission.com/meetingsandarchives"
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                nmtruthcommission.com — Meetings & archives
              </a>
            </li>
            <li>
              <a
                href={sources.sites.nmlegisHisc.committeePage}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                nmlegis.gov — HISC committee page
              </a>
            </li>
            <li>
              <a
                href={sources.sites.harmonySliq.portal}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Harmony SLIQ — legislative webcast portal
              </a>
            </li>
          </ul>
        </section>
      </main>
    </PageLayout>
  );
}
