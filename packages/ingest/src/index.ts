import * as cheerio from "cheerio";
import {
  extractHarmonyEventId,
  getClosedCaptionUrl,
  getCommissionMembers,
  getMeetingByEventId,
  getMeetingItems,
  getSubpoenaItems,
  loadSources,
  normalizeHarmonyUrl,
} from "./sources";
import type { DiscoveredUpcomingMeeting } from "./schedule/sync";

export type DiscoveredLink = {
  kind: "subpoena_pdf" | "harmony_recording" | "handout_pdf" | "agenda_pdf" | "html_page";
  url: string;
  label?: string;
};

export type PollResult = {
  source: string;
  checkedAt: string;
  links: DiscoveredLink[];
  subpoenaCount: number;
  meetingRecordingCount: number;
  upcomingMeetings?: DiscoveredUpcomingMeeting[];
};

const MONTH_NAME_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function discoverUpcomingFromMeetingsHtml(html: string): DiscoveredUpcomingMeeting[] {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const discoveries: DiscoveredUpcomingMeeting[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  const patterns = [
    /upcoming[^.]{0,40}?([A-Za-z]+)\s+(\d{4})/gi,
    /next meeting[^.]{0,40}?([A-Za-z]+)\s+(\d{4})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const monthName = match[1]!.toLowerCase();
      const year = match[2]!;
      const month = MONTH_NAME_MAP[monthName];
      if (!month) continue;

      const date = `${year}-${month}-01`;
      if (date < today || seen.has(date)) continue;
      seen.add(date);

      discoveries.push({
        externalId: `commission-${year}-${month}-upcoming`,
        title: `Survivors' Truth Commission — ${match[1]} ${year} (commission site)`,
        date,
        sourceNotes:
          "Listed on nmtruthcommission.com/meetingsandarchives; details TBD. nmlegis may list a different date.",
      });
    }
  }

  return discoveries;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "TruthCommissionTracker/0.1 (+https://github.com/rmarti55/TruthCommission)" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

export async function pollCommissionSite(): Promise<PollResult> {
  const sources = loadSources();
  const base = sources.sites.nmtruthcommission.baseUrl;
  const pages = [
    sources.sites.nmtruthcommission.pages.recentSubpoenas,
    sources.sites.nmtruthcommission.pages.meetingsAndArchives,
    sources.sites.nmtruthcommission.pages.contact,
    sources.sites.nmtruthcommission.pages.publicInformation,
  ];

  const links: DiscoveredLink[] = [];
  let upcomingMeetings: DiscoveredUpcomingMeeting[] = [];

  for (const page of pages) {
    const html = await fetchHtml(`${base}${page}`);
    const $ = cheerio.load(html);

    if (page.includes("meetings")) {
      upcomingMeetings = discoverUpcomingFromMeetingsHtml(html);
    }

    if (
      page.includes("contact") ||
      page.includes("truthcommissioninfo") ||
      page.includes("about")
    ) {
      links.push({
        kind: "html_page",
        url: `${base}${page}`,
        label: page,
      });
    }

    $('a[href$=".pdf"], a[href*=".pdf"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const url = href.startsWith("http") ? href : `${base}${href}`;
      links.push({
        kind: page.includes("subpoena") ? "subpoena_pdf" : "handout_pdf",
        url,
        label: $(el).text().trim() || undefined,
      });
    });

    $('a[href*="harmony.sliq.net"], a[href*="linkprotect.cudasvc.com"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const url = normalizeHarmonyUrl(href);
      if (extractHarmonyEventId(url)) {
        links.push({
          kind: "harmony_recording",
          url,
          label: $(el).text().trim() || undefined,
        });
      }
    });
  }

  const knownSubpoenas = getSubpoenaItems().map((item) => item.url);

  return {
    source: "nmtruthcommission.com",
    checkedAt: new Date().toISOString(),
    links,
    subpoenaCount: knownSubpoenas.length,
    meetingRecordingCount: links.filter((l) => l.kind === "harmony_recording").length,
    upcomingMeetings,
  };
}

export async function pollNmLegisHisc(): Promise<PollResult> {
  const pageUrl = loadSources().sites.nmlegisHisc.committeePage;
  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);
  const links: DiscoveredLink[] = [];

  $('a[href*="agendas/HISCage"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const url = href.startsWith("http") ? href : `https://www.nmlegis.gov${href.replace(/^\.\./, "")}`;
    links.push({ kind: "agenda_pdf", url, label: $(el).text().trim() || undefined });
  });

  $('a[href*="harmony.sliq.net"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    links.push({
      kind: "harmony_recording",
      url: href,
      label: $(el).text().trim() || undefined,
    });
  });

  return {
    source: "nmlegis.gov/HISC",
    checkedAt: new Date().toISOString(),
    links,
    subpoenaCount: 0,
    meetingRecordingCount: links.filter((l) => l.kind === "harmony_recording").length,
  };
}

export async function pollAllSources() {
  const [commission, nmlegis] = await Promise.all([
    pollCommissionSite(),
    pollNmLegisHisc(),
  ]);

  return {
    commission,
    nmlegis,
    totalLinks: commission.links.length + nmlegis.links.length,
  };
}

export {
  loadSources,
  getSubpoenaItems,
  getCommissionMembers,
  getMeetingItems,
  getMeetingByEventId,
  getAllMeetings,
  getUpcomingMeetings,
  getConfirmedAgendaUrls,
  parseAgendaDateFromUrl,
  externalIdFromDate,
  getClosedCaptionUrl,
  extractHarmonyEventId,
  normalizeHarmonyUrl,
} from "./sources";
export type { CommissionMember } from "./sources";
export {
  ingestSubpoenaItem,
  ingestSubpoenaUrls,
  ingestSubpoenas,
  type IngestedSubpoena,
  type IngestSubpoenasResult,
} from "./subpoena/ingest";
export {
  ingestHarmonyMeeting,
  ingestHarmonyMeetings,
  ingestHarmonyByEventIds,
  ingestHarmonyFromUrls,
  type IngestedMeeting,
  type IngestMeetingsResult,
} from "./harmony/ingest";
export {
  loadStakeholders,
  getStakeholderOrganizations,
  getOfficialPages,
  getDocumentSeeds,
  findOrgByName,
} from "./stakeholders";
export { extractEmailsFromText } from "./discovery/extract-emails";
export { extractMailtoFromHtml } from "./discovery/extract-mailto";
export { crawlOrganization, crawlAllOrganizations } from "./discovery/crawl-org";
export { crawlOfficialPages } from "./discovery/crawl-official";
export {
  extractEmailsFromArtifacts,
  extractEmailsFromTranscripts,
} from "./discovery/extract-artifacts";
export {
  upsertDiscoveredEmail,
  seedOrganizationsFromManifest,
  type DiscoveredEmailInput,
  type UpsertEmailResult,
} from "./discovery/upsert";
export {
  runContactDiscovery,
  type ContactDiscoveryOptions,
  type ContactDiscoveryResult,
  type LlmStakeholderExtractor,
} from "./discovery/run-discovery";
export {
  ingestPdfDocument,
  ingestPdfDocumentsFromSeeds,
  type IngestPdfOptions,
  type IngestedDocument,
  type DocumentArtifactType,
} from "./document/ingest-pdf";
export {
  syncMeetingsFromManifest,
  upsertDiscoveredUpcomingMeeting,
  markMeetingPastByDate,
  type SyncedMeeting,
  type SyncMeetingsResult,
  type DiscoveredUpcomingMeeting,
} from "./schedule/sync";
export {
  ingestAgendaUrl,
  ingestAgendaUrls,
  type IngestedAgenda,
  type IngestAgendasResult,
} from "./schedule/ingest";
