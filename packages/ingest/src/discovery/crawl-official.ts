import type { Database } from "@truth-commission/db";
import { getOfficialPages } from "../stakeholders";
import { extractMailtoFromHtml } from "./extract-mailto";
import { fetchHtml } from "./fetch";
import { upsertDiscoveredEmail, type UpsertEmailResult } from "./upsert";

export async function crawlOfficialPages(
  db: Database,
): Promise<{ pages: number; urls: string[]; results: UpsertEmailResult[]; errors: string[] }> {
  const pages = getOfficialPages();
  const urls: string[] = [];
  const results: UpsertEmailResult[] = [];
  const errors: string[] = [];

  for (const page of pages) {
    try {
      const { url: finalUrl, html } = await fetchHtml(page.url);
      urls.push(finalUrl);
      const emails = extractMailtoFromHtml(html, finalUrl);

      for (const item of emails) {
        const result = await upsertDiscoveredEmail(db, {
          email: item.email,
          sourceType: "web_page",
          sourceUrl: finalUrl,
          snippet: item.snippet,
          confidence: item.confidence,
          organizationName: page.name,
          organizationExternalId:
            page.category === "commission" ? "nmtruthcommission_contact" : undefined,
        });
        results.push(result);
      }
    } catch (error) {
      errors.push(`${page.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { pages: pages.length, urls, results, errors };
}
