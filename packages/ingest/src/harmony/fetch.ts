import { getHarmonyApiBase, loadSources } from "../sources";

const USER_AGENT =
  "TruthCommissionTracker/0.1 (+https://github.com/rmarti55/TruthCommission)";

function buildUrl(templateKey: "getNewData" | "getClosedCaption" | "getStreamData", eventId: string) {
  const endpoints = loadSources().sites.harmonySliq.endpoints;
  const template = endpoints[templateKey];
  return template.replace("{apiBase}", getHarmonyApiBase()).replace("{eventId}", eventId);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Harmony API ${url} returned HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchClosedCaption(eventId: string): Promise<Record<string, unknown>> {
  return fetchJson(buildUrl("getClosedCaption", eventId));
}

export async function fetchStreamData(eventId: string): Promise<Record<string, unknown>> {
  return fetchJson(buildUrl("getStreamData", eventId));
}

export async function fetchMeetingMetadata(eventId: string): Promise<Record<string, unknown>> {
  return fetchJson(buildUrl("getNewData", eventId));
}

export function extractStreamUrl(data: Record<string, unknown>): string | null {
  const streams = data.Streams ?? data.streams;
  if (!Array.isArray(streams)) return null;

  for (const stream of streams) {
    if (typeof stream !== "object" || stream === null) continue;
    const record = stream as Record<string, unknown>;
    const url = record.Url ?? record.url ?? record.StreamUrl ?? record.streamUrl;
    if (typeof url === "string" && url.includes(".m3u8")) {
      return url;
    }
  }

  return null;
}
