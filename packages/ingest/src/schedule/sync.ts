import { meetings, type Database, type MeetingMetadata } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { getAllMeetings, loadSources, type SourcesManifest } from "../sources";

type MeetingEntry = SourcesManifest["meetings"][number];

function meetingDateFromEntry(entry: MeetingEntry): Date {
  return new Date(`${entry.date}T12:00:00.000Z`);
}

function metadataFromEntry(entry: MeetingEntry): MeetingMetadata {
  const metadata: MeetingMetadata = {};

  if ("sources" in entry && entry.sources) {
    if ("nmlegis" in entry.sources && entry.sources.nmlegis) {
      const nmlegis = entry.sources.nmlegis as {
        agendaUrl?: string;
        handoutsListUrl?: string;
        zoomUrl?: string;
      };
      if (nmlegis.agendaUrl) metadata.agendaUrl = nmlegis.agendaUrl;
      if (nmlegis.handoutsListUrl) metadata.handoutsListUrl = nmlegis.handoutsListUrl;
      if (nmlegis.zoomUrl) metadata.zoomUrl = nmlegis.zoomUrl;
    }
    if ("commission" in entry.sources && entry.sources.commission) {
      const commission = entry.sources.commission as { note?: string };
      if (commission.note) metadata.sourceNotes = commission.note;
    }
  }

  if ("documents" in entry && entry.documents) {
    const docs = entry.documents as Record<string, unknown>;
    if (typeof docs.nmlegisAgenda === "string") metadata.agendaUrl = docs.nmlegisAgenda;
    if (typeof docs.nmlegisHandoutsList === "string") {
      metadata.handoutsListUrl = docs.nmlegisHandoutsList;
    }
  }

  const zoomPattern = loadSources().sites.nmlegisHisc.patterns.zoomWebinar;
  if (!metadata.zoomUrl && entry.status === "upcoming" && zoomPattern) {
    metadata.zoomUrl = zoomPattern;
  }

  return metadata;
}

export type SyncedMeeting = {
  externalId: string;
  title: string;
  isNew: boolean;
};

export type SyncMeetingsResult = {
  synced: SyncedMeeting[];
  errors: Array<{ id: string; error: string }>;
};

export async function syncMeetingsFromManifest(db: Database): Promise<SyncMeetingsResult> {
  const items = getAllMeetings();
  const synced: SyncedMeeting[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    try {
      const existing = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.externalId, item.id))
        .limit(1);

      const harmonyEventId =
        "harmonyEventId" in item ? (item.harmonyEventId as string | undefined) : undefined;
      const streamUrl =
        "harmony" in item && item.harmony
          ? (item.harmony as { streamUrl?: string }).streamUrl
          : undefined;
      const metadata = metadataFromEntry(item);

      if (existing[0]) {
        await db
          .update(meetings)
          .set({
            title: item.title,
            meetingDate: meetingDateFromEntry(item),
            harmonyEventId: harmonyEventId ?? null,
            streamUrl: streamUrl ?? null,
            status: item.status,
            metadata,
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, existing[0].id));

        synced.push({ externalId: item.id, title: item.title, isNew: false });
      } else {
        await db.insert(meetings).values({
          externalId: item.id,
          title: item.title,
          meetingDate: meetingDateFromEntry(item),
          harmonyEventId: harmonyEventId ?? null,
          streamUrl: streamUrl ?? null,
          status: item.status,
          metadata,
        });

        synced.push({ externalId: item.id, title: item.title, isNew: true });
      }
    } catch (error) {
      errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { synced, errors };
}

export type DiscoveredUpcomingMeeting = {
  externalId: string;
  title: string;
  date: string;
  sourceNotes: string;
};

export async function upsertDiscoveredUpcomingMeeting(
  db: Database,
  meeting: DiscoveredUpcomingMeeting,
): Promise<SyncedMeeting> {
  const existing = await db
    .select({ id: meetings.id, metadata: meetings.metadata })
    .from(meetings)
    .where(eq(meetings.externalId, meeting.externalId))
    .limit(1);

  const metadata: MeetingMetadata = {
    sourceNotes: meeting.sourceNotes,
  };

  if (existing[0]) {
    const merged = { ...(existing[0].metadata ?? {}), ...metadata };
    await db
      .update(meetings)
      .set({
        title: meeting.title,
        meetingDate: new Date(`${meeting.date}T12:00:00.000Z`),
        status: "upcoming",
        metadata: merged,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, existing[0].id));

    return { externalId: meeting.externalId, title: meeting.title, isNew: false };
  }

  await db.insert(meetings).values({
    externalId: meeting.externalId,
    title: meeting.title,
    meetingDate: new Date(`${meeting.date}T12:00:00.000Z`),
    status: "upcoming",
    metadata,
  });

  return { externalId: meeting.externalId, title: meeting.title, isNew: true };
}

export async function markMeetingPastByDate(
  db: Database,
  date: string,
): Promise<void> {
  const rows = await db.select().from(meetings);
  const target = date.slice(0, 10);

  for (const row of rows) {
    if (!row.meetingDate) continue;
    const rowDate = row.meetingDate.toISOString().slice(0, 10);
    if (rowDate === target && row.status === "upcoming") {
      await db
        .update(meetings)
        .set({ status: "past", updatedAt: new Date() })
        .where(eq(meetings.id, row.id));
    }
  }
}
