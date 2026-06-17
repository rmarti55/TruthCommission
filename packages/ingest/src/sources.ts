import sourcesManifest from "../../../recon/sources.json";

export type SourcesManifest = typeof sourcesManifest;

export function loadSources(): SourcesManifest {
  return sourcesManifest;
}

export function getSubpoenaItems() {
  return loadSources().subpoenas.items;
}

export type CommissionMember = SourcesManifest["commissionMembers"]["members"][number];

export function getCommissionMembers() {
  return loadSources().commissionMembers;
}

type MeetingEntry = SourcesManifest["meetings"][number];

export type MeetingManifestItem = MeetingEntry & {
  harmonyEventId: string;
  harmony: {
    browserUrl: string;
    startTime: string;
    endTime: string;
    streamUrl: string;
    captionLangKey?: string;
  };
};

export function getMeetingItems(): MeetingManifestItem[] {
  return loadSources().meetings.filter(
    (meeting): meeting is MeetingManifestItem =>
      Boolean(meeting.harmonyEventId && "harmony" in meeting && meeting.harmony),
  );
}

export function getMeetingByEventId(eventId: string): MeetingManifestItem | undefined {
  return getMeetingItems().find((meeting) => meeting.harmonyEventId === eventId);
}

export function getAllMeetings(): MeetingEntry[] {
  return loadSources().meetings;
}

export function getUpcomingMeetings(): MeetingEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return getAllMeetings().filter(
    (meeting) => meeting.status === "upcoming" || meeting.date >= today,
  );
}

const MONTH_ABBREV: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function parseAgendaDateFromUrl(url: string): string | null {
  const match = url.match(/HISCage([A-Z][a-z]{2})(\d{2})\.26\.pdf/i);
  if (!match) return null;

  const month = MONTH_ABBREV[match[1]!];
  if (!month) return null;

  return `2026-${month}-${match[2]}`;
}

export function externalIdFromDate(date: string): string {
  return `hisc-${date}`;
}

export function getConfirmedAgendaUrls(): string[] {
  const sources = loadSources();
  const urls = sources.sites.nmlegisHisc.confirmedAgendas.map((entry) => entry.url);

  for (const meeting of getAllMeetings()) {
    if ("sources" in meeting && meeting.sources && "nmlegis" in meeting.sources) {
      const nmlegis = meeting.sources.nmlegis as { agendaUrl?: string };
      if (nmlegis.agendaUrl) urls.push(nmlegis.agendaUrl);
    }
  }

  return [...new Set(urls)];
}

export function getStreamDataUrl(eventId: string) {
  const template = loadSources().sites.harmonySliq.endpoints.getStreamData;
  return template.replace("{apiBase}", getHarmonyApiBase()).replace("{eventId}", eventId);
}

export function getNewDataUrl(eventId: string) {
  const template = loadSources().sites.harmonySliq.endpoints.getNewData;
  return template.replace("{apiBase}", getHarmonyApiBase()).replace("{eventId}", eventId);
}

export function getHarmonyApiBase() {
  return loadSources().sites.harmonySliq.apiBase;
}

export function getClosedCaptionUrl(eventId: string) {
  const template = loadSources().sites.harmonySliq.endpoints.getClosedCaption;
  return template.replace("{apiBase}", getHarmonyApiBase()).replace("{eventId}", eventId);
}

export function extractHarmonyEventId(url: string): string | null {
  const match = url.match(/\/-1\/(\d+)(?:#|$)/);
  return match?.[1] ?? null;
}

export function normalizeHarmonyUrl(url: string): string {
  if (url.includes("linkprotect.cudasvc.com")) {
    const wrapped = new URL(url).searchParams.get("a");
    if (wrapped) return decodeURIComponent(wrapped);
  }
  return url;
}
