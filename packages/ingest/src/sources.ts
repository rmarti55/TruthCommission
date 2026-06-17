import sourcesManifest from "../../../recon/sources.json";

export type SourcesManifest = typeof sourcesManifest;

export function loadSources(): SourcesManifest {
  return sourcesManifest;
}

export function getSubpoenaItems() {
  return loadSources().subpoenas.items;
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
