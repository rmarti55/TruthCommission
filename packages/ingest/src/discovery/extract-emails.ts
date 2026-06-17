const EMAIL_REGEX =
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g;

const JUNK_DOMAINS = new Set([
  "example.com",
  "example.org",
  "test.com",
  "domain.com",
  "email.com",
  "sentry.io",
  "wixpress.com",
  "squarespace.com",
  "schema.org",
]);

const JUNK_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
  "root",
  "admin",
  "support",
  "help",
  "privacy",
  "abuse",
  "unsubscribe",
]);

export type ExtractedEmail = {
  email: string;
  snippet: string;
  confidence: number;
};

function isJunkEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return true;
  if (JUNK_DOMAINS.has(domain)) return true;
  if (domain.endsWith(".png") || domain.endsWith(".jpg") || domain.endsWith(".gif")) {
    return true;
  }
  if (local.includes("..") || local.startsWith(".") || local.endsWith(".")) return true;
  if (JUNK_LOCAL_PARTS.has(local)) return true;
  if (domain.includes("static1.squarespace")) return true;
  return false;
}

function snippetAround(text: string, index: number, email: string): string {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + email.length + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function extractEmailsFromText(
  text: string,
  options?: { confidence?: number },
): ExtractedEmail[] {
  const confidence = options?.confidence ?? 70;
  const seen = new Set<string>();
  const results: ExtractedEmail[] = [];

  for (const match of text.matchAll(EMAIL_REGEX)) {
    const raw = match[0];
    const email = raw.toLowerCase();
    if (seen.has(email) || isJunkEmail(email)) continue;
    seen.add(email);
    results.push({
      email,
      snippet: snippetAround(text, match.index ?? 0, raw),
      confidence,
    });
  }

  return results;
}

export function extractEmailsFromHtmlText(html: string): ExtractedEmail[] {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return extractEmailsFromText(text, { confidence: 65 });
}
