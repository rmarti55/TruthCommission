import { artifacts, meetings, type Database, type MeetingMetadata } from "@truth-commission/db";
import { eq, or } from "drizzle-orm";
import { extractPdfText } from "../subpoena/extract";
import {
  externalIdFromDate,
  getAllMeetings,
  parseAgendaDateFromUrl,
} from "../sources";
import { downloadAgendaPdf } from "./download";
import {
  parseAgendaText,
  slugFromAgendaDate,
  titleFromAgendaDate,
  type ParsedAgenda,
} from "./parse";

export type IngestedAgenda = {
  id: string;
  slug: string;
  meetingExternalId: string;
  meetingDate: string;
  agendaItemCount: number;
  isNew: boolean;
};

export type IngestAgendasResult = {
  ingested: IngestedAgenda[];
  skipped: string[];
  errors: Array<{ url: string; error: string }>;
};

async function findExistingAgendaArtifact(
  db: Database,
  slug: string,
  contentHash: string,
): Promise<{ id: string; slug: string } | null> {
  const existing = await db
    .select({ id: artifacts.id, slug: artifacts.slug, contentHash: artifacts.contentHash })
    .from(artifacts)
    .where(or(eq(artifacts.slug, slug), eq(artifacts.contentHash, contentHash)))
    .limit(5);

  return existing[0] ?? null;
}

function manifestMeetingForDate(date: string) {
  return getAllMeetings().find((meeting) => meeting.date === date);
}

function handoutsListUrlForDate(date: string): string | undefined {
  const [year, month, day] = date.split("-");
  const m = Number(month);
  const d = Number(day);
  return `https://www.nmlegis.gov/Committee/Handouts_List?CommitteeCode=HISC&Date=${m}/${d}/${year}`;
}

async function upsertMeetingForAgenda(
  db: Database,
  parsed: ParsedAgenda,
  agendaUrl: string,
): Promise<{ id: string; externalId: string }> {
  const manifest = manifestMeetingForDate(parsed.meetingDate);
  const externalId = manifest?.id ?? externalIdFromDate(parsed.meetingDate);
  const today = new Date().toISOString().slice(0, 10);
  const status = parsed.meetingDate >= today ? "upcoming" : "past";

  const metadata: MeetingMetadata = {
    format: parsed.format,
    startTime: parsed.startTime,
    agendaUrl,
    handoutsListUrl: handoutsListUrlForDate(parsed.meetingDate),
  };

  if (manifest && "sources" in manifest && manifest.sources) {
    if ("nmlegis" in manifest.sources && manifest.sources.nmlegis) {
      const nmlegis = manifest.sources.nmlegis as {
        zoomUrl?: string;
        handoutsListUrl?: string;
      };
      if (nmlegis.zoomUrl) metadata.zoomUrl = nmlegis.zoomUrl;
      if (nmlegis.handoutsListUrl) metadata.handoutsListUrl = nmlegis.handoutsListUrl;
    }
    if ("commission" in manifest.sources && manifest.sources.commission) {
      const commission = manifest.sources.commission as { note?: string };
      if (commission.note) metadata.sourceNotes = commission.note;
    }
  }

  const existing = await db
    .select({ id: meetings.id, metadata: meetings.metadata })
    .from(meetings)
    .where(eq(meetings.externalId, externalId))
    .limit(1);

  const title = manifest?.title ?? parsed.title;

  if (existing[0]) {
    const merged: MeetingMetadata = {
      ...(existing[0].metadata ?? {}),
      ...metadata,
    };

    await db
      .update(meetings)
      .set({
        title,
        meetingDate: new Date(`${parsed.meetingDate}T12:00:00.000Z`),
        status,
        metadata: merged,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, existing[0].id));

    return { id: existing[0].id, externalId };
  }

  const [row] = await db
    .insert(meetings)
    .values({
      externalId,
      title,
      meetingDate: new Date(`${parsed.meetingDate}T12:00:00.000Z`),
      status,
      metadata,
    })
    .returning({ id: meetings.id });

  return { id: row.id, externalId };
}

export async function ingestAgendaUrl(
  db: Database,
  url: string,
): Promise<IngestedAgenda | null> {
  const fallbackDate = parseAgendaDateFromUrl(url) ?? undefined;
  const downloaded = await downloadAgendaPdf(url);
  const fullText = await extractPdfText(downloaded.bytes);
  const parsed = parseAgendaText(fullText, fallbackDate);
  const resolvedSlug = slugFromAgendaDate(parsed.meetingDate);
  const meeting = await upsertMeetingForAgenda(db, parsed, url);

  const existingArtifact = await findExistingAgendaArtifact(
    db,
    resolvedSlug,
    downloaded.contentHash,
  );

  const artifactValues = {
    status: "published" as const,
    title: titleFromAgendaDate(parsed.meetingDate),
    sourceUrl: url,
    blobUrl: downloaded.finalUrl,
    contentHash: downloaded.contentHash,
    publishedAt: new Date(`${parsed.meetingDate}T12:00:00.000Z`),
    fullText,
    meetingId: meeting.id,
    metadata: {
      manifestId: meeting.externalId,
      meetingDate: parsed.meetingDate,
      format: parsed.format,
      startTime: parsed.startTime,
      revisedDate: parsed.revisedDate,
      agendaItems: parsed.agendaItems,
    },
  };

  if (existingArtifact) {
    await db
      .update(artifacts)
      .set({
        ...artifactValues,
        slug: resolvedSlug,
        type: "agenda",
      })
      .where(eq(artifacts.id, existingArtifact.id));

    return {
      id: existingArtifact.id,
      slug: resolvedSlug,
      meetingExternalId: meeting.externalId,
      meetingDate: parsed.meetingDate,
      agendaItemCount: parsed.agendaItems.length,
      isNew: false,
    };
  }

  const [artifact] = await db
    .insert(artifacts)
    .values({
      type: "agenda",
      sensitivity: "public",
      slug: resolvedSlug,
      ...artifactValues,
    })
    .returning({ id: artifacts.id, slug: artifacts.slug });

  return {
    id: artifact.id,
    slug: artifact.slug,
    meetingExternalId: meeting.externalId,
    meetingDate: parsed.meetingDate,
    agendaItemCount: parsed.agendaItems.length,
    isNew: true,
  };
}

export async function ingestAgendaUrls(
  db: Database,
  urls: string[],
): Promise<IngestAgendasResult> {
  const ingested: IngestedAgenda[] = [];
  const skipped: string[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of [...new Set(urls)]) {
    try {
      const result = await ingestAgendaUrl(db, url);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(url);
      }
    } catch (error) {
      errors.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}
