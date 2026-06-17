import type { Database } from "@truth-commission/db";
import { getStakeholderOrganizations, type StakeholderOrg } from "../stakeholders";
import { extractMailtoFromHtml } from "./extract-mailto";
import { fetchHtml } from "./fetch";
import { upsertDiscoveredEmail, type UpsertEmailResult } from "./upsert";

const MAX_PAGES_PER_ORG = 10;

function resolveCrawlUrl(website: string, path: string): string {
  try {
    return new URL(path, website).href;
  } catch {
    return `${website.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  }
}

export async function crawlOrganization(
  db: Database,
  seed: StakeholderOrg,
): Promise<{ urls: string[]; results: UpsertEmailResult[]; errors: string[] }> {
  const results: UpsertEmailResult[] = [];
  const errors: string[] = [];
  const urls: string[] = [];

  if (!seed.website) {
    return { urls, results, errors: ["No website configured"] };
  }

  const paths = seed.crawlPaths?.length ? seed.crawlPaths : ["/", "/contact"];
  const toFetch = paths.slice(0, MAX_PAGES_PER_ORG).map((path) => resolveCrawlUrl(seed.website!, path));

  for (const url of toFetch) {
    try {
      const { url: finalUrl, html } = await fetchHtml(url);
      urls.push(finalUrl);
      const emails = extractMailtoFromHtml(html, finalUrl);

      for (const item of emails) {
        const result = await upsertDiscoveredEmail(db, {
          email: item.email,
          sourceType: finalUrl.includes("mailto:") ? "html_mailto" : "web_page",
          sourceUrl: finalUrl,
          snippet: item.snippet,
          confidence: item.confidence,
          organizationExternalId: seed.id,
          organizationName: seed.name,
        });
        results.push(result);
      }
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { urls, results, errors };
}

export async function crawlAllOrganizations(
  db: Database,
): Promise<{
  organizations: number;
  urls: string[];
  results: UpsertEmailResult[];
  errors: string[];
}> {
  const seeds = getStakeholderOrganizations().filter((org) => org.website);
  const allUrls: string[] = [];
  const allResults: UpsertEmailResult[] = [];
  const allErrors: string[] = [];

  for (const seed of seeds) {
    const { urls, results, errors } = await crawlOrganization(db, seed);
    allUrls.push(...urls);
    allResults.push(...results);
    allErrors.push(...errors.map((e) => `${seed.id}: ${e}`));
  }

  return {
    organizations: seeds.length,
    urls: allUrls,
    results: allResults,
    errors: allErrors,
  };
}
