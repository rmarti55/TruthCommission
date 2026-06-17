import { artifacts, captionSegments, meetings, type Database } from "@truth-commission/db";
import { eq, or } from "drizzle-orm";
import {
  extractHarmonyEventId,
  getMeetingByEventId,
  getMeetingItems,
  type MeetingManifestItem,
} from "../sources";
import { fetchClosedCaption, fetchStreamData, extractStreamUrl } from "./fetch";
import { parseClosedCaptions, slugFromMeetingId } from "./parse";

export type IngestedMeeting = {
  id: string;
  slug: string;
  externalId: string;
  title: string;
  segmentCount: number;
  isNew: boolean;
};

export type IngestMeetingsResult = {
  ingested: IngestedMeeting[];
  skipped: string[];
  errors: Array<{ id: string; error: string }>;
};

async function artifactExists(
  db: Database,
  slug: string,
  contentHash: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: artifacts.id })
    .from(artifacts)
    .where(or(eq(artifacts.slug, slug), eq(artifacts.contentHash, contentHash)))
    .limit(1);

  return existing.length > 0;
}

async function upsertMeeting(db: Database, item: MeetingManifestItem) {
  const harmony = item.harmony!;
  const existing = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.externalId, item.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(meetings)
      .set({
        title: item.title,
        meetingDate: new Date(`${item.date}T12:00:00.000Z`),
        harmonyEventId: item.harmonyEventId,
        streamUrl: harmony.streamUrl,
        status: item.status,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, existing[0].id));

    return existing[0].id;
  }

  const [row] = await db
    .insert(meetings)
    .values({
      externalId: item.id,
      title: item.title,
      meetingDate: new Date(`${item.date}T12:00:00.000Z`),
      harmonyEventId: item.harmonyEventId,
      streamUrl: harmony.streamUrl,
      status: item.status,
    })
    .returning({ id: meetings.id });

  return row.id;
}

function meetingDocuments(item: MeetingManifestItem): Record<string, unknown> {
  if ("documents" in item && item.documents) {
    return item.documents as Record<string, unknown>;
  }
  if ("sources" in item && item.sources) {
    return item.sources as Record<string, unknown>;
  }
  return {};
}

export async function ingestHarmonyMeeting(
  db: Database,
  item: MeetingManifestItem,
): Promise<IngestedMeeting | null> {
  if (!item.harmonyEventId || !item.harmony) {
    throw new Error(`Meeting ${item.id} is missing Harmony metadata`);
  }

  const slug = slugFromMeetingId(item.id);
  const captionData = await fetchClosedCaption(item.harmonyEventId);
  const parsed = parseClosedCaptions(captionData, item.harmony.startTime);

  if (await artifactExists(db, slug, parsed.contentHash)) {
    return null;
  }

  let streamUrl = item.harmony.streamUrl;
  try {
    const streamData = await fetchStreamData(item.harmonyEventId);
    streamUrl = extractStreamUrl(streamData) ?? streamUrl;
  } catch {
    // Manifest stream URL is sufficient fallback.
  }

  const meetingId = await upsertMeeting(db, item);

  const [artifact] = await db
    .insert(artifacts)
    .values({
      type: "meeting_transcript",
      status: "ingested",
      sensitivity: parsed.sensitivity,
      title: item.title,
      slug,
      sourceUrl: item.harmony.browserUrl,
      blobUrl: streamUrl,
      contentHash: parsed.contentHash,
      publishedAt: new Date(`${item.date}T12:00:00.000Z`),
      fullText: parsed.fullText,
      meetingId,
      metadata: {
        manifestId: item.id,
        harmonyEventId: item.harmonyEventId,
        meetingDate: item.date,
        startTime: item.harmony.startTime,
        endTime: item.harmony.endTime,
        streamUrl,
        contentWarning: parsed.contentWarning,
        paragraphs: parsed.paragraphs,
        segmentCount: parsed.segments.length,
        documents: meetingDocuments(item),
      },
    })
    .returning({ id: artifacts.id, slug: artifacts.slug });

  const chunkSize = 200;
  for (let offset = 0; offset < parsed.segments.length; offset += chunkSize) {
    const chunk = parsed.segments.slice(offset, offset + chunkSize);
    await db.insert(captionSegments).values(
      chunk.map((segment) => ({
        artifactId: artifact.id,
        sequence: segment.sequence,
        beginAt: segment.beginAt,
        endAt: segment.endAt,
        content: segment.content,
      })),
    );
  }

  return {
    id: artifact.id,
    slug: artifact.slug,
    externalId: item.id,
    title: item.title,
    segmentCount: parsed.segments.length,
    isNew: true,
  };
}

export async function ingestHarmonyMeetings(db: Database): Promise<IngestMeetingsResult> {
  const items = getMeetingItems();
  const ingested: IngestedMeeting[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    try {
      const result = await ingestHarmonyMeeting(db, item);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(item.id);
      }
    } catch (error) {
      errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}

export async function ingestHarmonyByEventIds(
  db: Database,
  eventIds: string[],
): Promise<IngestMeetingsResult> {
  const ingested: IngestedMeeting[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const eventId of [...new Set(eventIds)]) {
    const item = getMeetingByEventId(eventId);
    if (!item) {
      errors.push({ id: eventId, error: "No manifest entry for Harmony event ID" });
      continue;
    }

    try {
      const result = await ingestHarmonyMeeting(db, item);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(item.id);
      }
    } catch (error) {
      errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}

export async function ingestHarmonyFromUrls(
  db: Database,
  urls: string[],
): Promise<IngestMeetingsResult> {
  const eventIds = urls
    .map((url) => extractHarmonyEventId(url))
    .filter((id): id is string => Boolean(id));

  return ingestHarmonyByEventIds(db, eventIds);
}
