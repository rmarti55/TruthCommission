import * as cheerio from "cheerio";
import { extractEmailsFromText, type ExtractedEmail } from "./extract-emails";

export function extractMailtoFromHtml(
  html: string,
  pageUrl?: string,
): ExtractedEmail[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: ExtractedEmail[] = [];

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const raw = href.replace(/^mailto:/i, "").split("?")[0]?.trim();
    if (!raw) return;
    const email = raw.toLowerCase();
    if (seen.has(email)) return;
    seen.add(email);

    const label = $(el).text().trim();
    const snippet = label
      ? `mailto link: ${label}${pageUrl ? ` (${pageUrl})` : ""}`
      : `mailto link${pageUrl ? `: ${pageUrl}` : ""}`;

    results.push({ email, snippet, confidence: 85 });
  });

  const textEmails = extractEmailsFromText($.root().text(), { confidence: 60 });
  for (const item of textEmails) {
    if (seen.has(item.email)) continue;
    seen.add(item.email);
    results.push(item);
  }

  return results;
}
