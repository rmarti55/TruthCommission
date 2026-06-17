import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { LinkCard } from "@/components/ui/link-card";
import { ListCard } from "@/components/ui/list-card";
import { PageLayout } from "@/components/ui/page-layout";
import { SiteHeader } from "@/components/ui/site-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getDb } from "@/lib/db";
import { formatMeetingMeta, loadUpcomingMeetings } from "@/lib/meeting-helpers";
import { loadSources } from "@truth-commission/ingest";
import { artifacts, meetings } from "@truth-commission/db";
import { count, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ subscribe?: string }>;
}) {
  const sources = loadSources();
  const params = await searchParams;
  const db = getDb();

  const [publishedCount] = db
    ? await db
        .select({ value: count() })
        .from(artifacts)
        .where(eq(artifacts.status, "published"))
    : [{ value: 0 }];

  const [subpoenaCount] = db
    ? await db
        .select({ value: count() })
        .from(artifacts)
        .where(eq(artifacts.type, "subpoena"))
    : [{ value: 0 }];

  const [meetingCount] = db
    ? await db
        .select({ value: count() })
        .from(meetings)
        .where(eq(meetings.status, "past"))
    : [{ value: 0 }];

  const recentMeetings =
    db === null
      ? []
      : await db
          .select({
            externalId: meetings.externalId,
            title: meetings.title,
            meetingDate: meetings.meetingDate,
          })
          .from(meetings)
          .where(eq(meetings.status, "past"))
          .orderBy(desc(meetings.meetingDate))
          .limit(4);

  const upcomingMeetings = (await loadUpcomingMeetings()).slice(0, 2);

  const subscribeMessage =
    params.subscribe === "confirmed"
      ? "Subscription confirmed. You will receive instant alerts."
      : params.subscribe === "unsubscribed"
        ? "You have been unsubscribed."
        : params.subscribe === "invalid-token"
          ? "That subscription link is invalid or expired."
          : null;

  return (
    <PageLayout
      header={
        <SiteHeader
          eyebrow="Independent civic tracker"
          title={"NM Survivors\u2019 Truth Commission"}
          badge="Block D MVP"
        />
      }
      footer={
        <p className="mt-20 pb-12 font-sans text-xs leading-relaxed text-muted">
          Not affiliated with the NM Legislature or the Truth Commission. Primary
          sources linked on every artifact page.
        </p>
      }
    >
      <main className="py-12 md:py-16">
        <section className="panel">
          <h2 className="text-lg tracking-[-0.015em]">Status</h2>
          <p className="prose-block mt-3">
            Searchable archive of June 2026 subpoenas and official meeting transcripts
            with timestamped captions from Harmony SLIQ. Each meeting page includes the
            official recording, AI summary, merged key moments, and full caption transcript.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Published artifacts"
              value={String(publishedCount.value)}
              highlight
              href="/artifacts"
            />
            <StatTile
              label="Subpoenas"
              value={String(subpoenaCount.value)}
              href="/artifacts?type=subpoena"
            />
            <StatTile
              label="Meetings"
              value={String(meetingCount.value)}
              href="/meetings"
            />
          </dl>
        </section>

        <section className="mt-20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg tracking-[-0.015em]">Archive</h2>
            <Link href="/artifacts" className="font-sans text-sm text-link">
              View all artifacts
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <LinkCard
              title="Subpoena archive"
              href="/artifacts?type=subpoena"
              detail={`${subpoenaCount.value} subpoenas searchable with summaries and source PDF links`}
            />
            <LinkCard
              title="Meetings"
              href="/meetings"
              detail={`${meetingCount.value} meetings with official video and searchable captions`}
            />
            <LinkCard
              title="Full archive"
              href="/artifacts"
              detail="Search all published subpoenas"
            />
            <LinkCard
              title="Health check"
              href="/api/health"
              detail="Service + database status JSON"
            />
          </div>
        </section>

        {upcomingMeetings.length > 0 ? (
          <section className="mt-20">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg tracking-[-0.015em]">Upcoming meetings</h2>
              <Link href="/meetings#upcoming" className="font-sans text-sm text-link">
                Full schedule
              </Link>
            </div>
            <ol className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <ListCard
                  key={meeting.externalId}
                  href={`/meetings/${meeting.externalId}`}
                  title={meeting.title}
                  meta={
                    <p className="mt-1 font-sans text-sm text-muted">
                      {formatMeetingMeta(
                        meeting.meetingDate,
                        meeting.format,
                        meeting.startTime,
                      )}
                    </p>
                  }
                  detail={
                    meeting.agendaItemCount
                      ? `${meeting.agendaItemCount} agenda items · agenda and Zoom links`
                      : "Agenda and teleconference links"
                  }
                />
              ))}
            </ol>
          </section>
        ) : null}

        {recentMeetings.length > 0 ? (
          <section className="mt-20">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg tracking-[-0.015em]">Recent meetings</h2>
              <Link href="/meetings" className="font-sans text-sm text-link">
                All meetings
              </Link>
            </div>
            <ol className="space-y-4">
              {recentMeetings.map((meeting) => (
                <ListCard
                  key={meeting.externalId}
                  href={`/meetings/${meeting.externalId}`}
                  title={meeting.title}
                  meta={
                    meeting.meetingDate ? (
                      <p className="mt-1 font-sans text-sm text-muted">
                        {meeting.meetingDate.toISOString().slice(0, 10)}
                      </p>
                    ) : null
                  }
                />
              ))}
            </ol>
          </section>
        ) : null}

        <section className="mt-20">
          <h2 className="mb-4 text-lg tracking-[-0.015em]">Official sources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <LinkCard
              title="Commission members"
              href="/committee"
              detail="Four bipartisan commissioners — names, districts, and contact emails"
            />
            <LinkCard
              title="Recent Subpoenas (commission site)"
              href="https://www.nmtruthcommission.com/subpoena"
              detail={`${sources.subpoenas.items.length} subpoenas cataloged — primary PDF source`}
            />
            <LinkCard
              title="Meetings & archives (commission site)"
              href="https://www.nmtruthcommission.com/meetingsandarchives"
              detail="Official meeting list, handouts, and Harmony recording links"
            />
            <LinkCard
              title="nmlegis HISC committee"
              href={sources.sites.nmlegisHisc.committeePage}
              detail="Agendas, handouts, official schedule, and recording links"
            />
            <LinkCard
              title="Harmony SLIQ portal"
              href={sources.sites.harmonySliq.portal}
              detail="Legislative webcast portal — caption API source for transcripts"
            />
          </div>
        </section>

        <section className="panel mt-20 max-w-prose">
          <h2 className="text-lg tracking-[-0.015em]">Email alerts</h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-muted">
            Get an instant alert when a new subpoena or meeting transcript is published.
          </p>
          {subscribeMessage ? (
            <p className="mt-3 font-sans text-sm text-text">{subscribeMessage}</p>
          ) : null}
          <SubscribeForm />
        </section>
      </main>
    </PageLayout>
  );
}
