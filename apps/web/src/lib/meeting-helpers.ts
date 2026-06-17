import type { MeetingMetadata } from "@truth-commission/db";
import { artifacts, meetings } from "@truth-commission/db";
import { getUpcomingMeetings } from "@truth-commission/ingest";
import { and, asc, eq, gte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type MeetingDocumentLink = {
  label: string;
  url: string;
};

function pushUniqueDocumentLink(links: MeetingDocumentLink[], link: MeetingDocumentLink) {
  if (!links.some((existing) => existing.url === link.url)) {
    links.push(link);
  }
}

export function documentLinksFromMetadata(
  metadata: MeetingMetadata | null | undefined,
  documents?: Record<string, unknown>,
): MeetingDocumentLink[] {
  const links: MeetingDocumentLink[] = [];

  if (metadata?.agendaUrl) {
    pushUniqueDocumentLink(links, { label: "Agenda (nmlegis)", url: metadata.agendaUrl });
  }
  if (metadata?.handoutsListUrl) {
    pushUniqueDocumentLink(links, {
      label: "Handouts list (nmlegis)",
      url: metadata.handoutsListUrl,
    });
  }
  if (metadata?.zoomUrl) {
    pushUniqueDocumentLink(links, { label: "Zoom teleconference", url: metadata.zoomUrl });
  }

  if (documents) {
    if (typeof documents.nmlegisAgenda === "string") {
      pushUniqueDocumentLink(links, { label: "Agenda (nmlegis)", url: documents.nmlegisAgenda });
    }
    if (typeof documents.nmlegisHandoutsList === "string") {
      pushUniqueDocumentLink(links, {
        label: "Handouts list (nmlegis)",
        url: documents.nmlegisHandoutsList,
      });
    }
    if (
      typeof documents.commissionHandout === "object" &&
      documents.commissionHandout &&
      typeof (documents.commissionHandout as Record<string, unknown>).fallbackUrl === "string"
    ) {
      pushUniqueDocumentLink(links, {
        label: "Handout (nmlegis fallback)",
        url: String((documents.commissionHandout as Record<string, unknown>).fallbackUrl),
      });
    }
    if (typeof documents.presentationUrl === "string") {
      pushUniqueDocumentLink(links, {
        label: "Presentation PDF",
        url: documents.presentationUrl,
      });
    }
  }

  return links;
}

export type UpcomingMeetingPreview = {
  externalId: string;
  title: string;
  meetingDate: string;
  format?: string;
  startTime?: string;
  agendaItemCount?: number;
  sourceNotes?: string;
};

export function manifestUpcomingPreviews(): UpcomingMeetingPreview[] {
  return getUpcomingMeetings().map((meeting) => {
    let format: string | undefined;
    let startTime: string | undefined;
    let sourceNotes: string | undefined;
    let agendaUrl: string | undefined;

    if ("sources" in meeting && meeting.sources) {
      if ("nmlegis" in meeting.sources && meeting.sources.nmlegis) {
        const nmlegis = meeting.sources.nmlegis as {
          agendaUrl?: string;
        };
        agendaUrl = nmlegis.agendaUrl;
      }
      if ("commission" in meeting.sources && meeting.sources.commission) {
        const commission = meeting.sources.commission as { note?: string };
        sourceNotes = commission.note;
      }
    }

    if (meeting.title.toLowerCase().includes("teleconference")) {
      format = "teleconference";
    }

    return {
      externalId: meeting.id,
      title: meeting.title,
      meetingDate: meeting.date,
      format,
      startTime,
      sourceNotes,
      agendaItemCount: agendaUrl ? undefined : 0,
    };
  });
}

export async function loadUpcomingMeetings(): Promise<UpcomingMeetingPreview[]> {
  const db = getDb();
  if (!db) return manifestUpcomingPreviews();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      externalId: meetings.externalId,
      title: meetings.title,
      meetingDate: meetings.meetingDate,
      metadata: meetings.metadata,
      agendaMetadata: artifacts.metadata,
    })
    .from(meetings)
    .leftJoin(
      artifacts,
      and(eq(artifacts.meetingId, meetings.id), eq(artifacts.type, "agenda")),
    )
    .where(or(eq(meetings.status, "upcoming"), gte(meetings.meetingDate, today)))
    .orderBy(asc(meetings.meetingDate));

  if (rows.length === 0) return manifestUpcomingPreviews();

  const byExternalId = new Map<
    string,
    {
      externalId: string;
      title: string;
      meetingDate: Date | null;
      metadata: MeetingMetadata | null;
      agendaItemCount: number;
    }
  >();

  for (const row of rows) {
    const existing = byExternalId.get(row.externalId);
    const agendaMeta = (row.agendaMetadata ?? {}) as Record<string, unknown>;
    const itemCount = Array.isArray(agendaMeta.agendaItems)
      ? agendaMeta.agendaItems.length
      : 0;

    if (!existing) {
      byExternalId.set(row.externalId, {
        externalId: row.externalId,
        title: row.title,
        meetingDate: row.meetingDate,
        metadata: row.metadata,
        agendaItemCount: itemCount,
      });
    } else if (itemCount > existing.agendaItemCount) {
      existing.agendaItemCount = itemCount;
    }
  }

  return [...byExternalId.values()].map((row) => ({
    externalId: row.externalId,
    title: row.title,
    meetingDate: row.meetingDate?.toISOString().slice(0, 10) ?? "",
    format: row.metadata?.format,
    startTime: row.metadata?.startTime,
    agendaItemCount: row.agendaItemCount || undefined,
    sourceNotes: row.metadata?.sourceNotes,
  }));
}

export function formatMeetingMeta(
  meetingDate: string | Date | null | undefined,
  format?: string,
  startTime?: string,
): string {
  const parts: string[] = [];
  if (meetingDate) {
    const date =
      meetingDate instanceof Date
        ? meetingDate.toISOString().slice(0, 10)
        : meetingDate.slice(0, 10);
    parts.push(date);
  }
  if (startTime) parts.push(startTime);
  if (format) parts.push(format);
  return parts.join(" · ");
}
