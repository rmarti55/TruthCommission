import * as cheerio from "cheerio";
import {
  extractHarmonyEventId,
  getClosedCaptionUrl,
  getSubpoenaItems,
  loadSources,
  normalizeHarmonyUrl,
} from "./sources";

export type DiscoveredLink = {
  kind: "subpoena_pdf" | "harmony_recording" | "handout_pdf" | "agenda_pdf";
  url: string;
  label?: string;
};

export type PollResult = {
  source: string;
  checkedAt: string;
  links: DiscoveredLink[];
  subpoenaCount: number;
  meetingRecordingCount: number;
};

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
  ];

  const links: DiscoveredLink[] = [];

  for (const page of pages) {
    const html = await fetchHtml(`${base}${page}`);
    const $ = cheerio.load(html);

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

export { loadSources, getSubpoenaItems, getClosedCaptionUrl, extractHarmonyEventId };
