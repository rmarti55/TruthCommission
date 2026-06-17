import { artifacts, type Database } from "@truth-commission/db";
import { eq, or } from "drizzle-orm";
import { getSubpoenaItems, loadSources } from "../sources";
import { downloadSubpoenaPdf } from "./download";
import { extractPdfText } from "./extract";
import {
  parseSubpoenaFields,
  slugFromSubpoenaId,
  titleFromRecipient,
  type SubpoenaManifestItem,
} from "./parse";

export type IngestedSubpoena = {
  id: string;
  slug: string;
  recipient: string;
  isNew: boolean;
};

export type IngestSubpoenasResult = {
  ingested: IngestedSubpoena[];
  skipped: string[];
  errors: Array<{ id: string; error: string }>;
};

function publishedAtFromIssuedDate(issuedDate: string): Date {
  return new Date(`${issuedDate}T12:00:00.000Z`);
}

async function artifactExists(
  db: Database,
  slug: string,
  contentHash: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: artifacts.id })
    .from(artifacts)
    .where(or(eq(artifacts.slug, slug), eq(artifacts.contentHash, contentHash)))
    .limit(1);

  return existing.length > 0;
}

export async function ingestSubpoenaItem(
  db: Database,
  item: SubpoenaManifestItem,
): Promise<IngestedSubpoena | null> {
  const slug = slugFromSubpoenaId(item.id);
  const downloaded = await downloadSubpoenaPdf(item.url, item.cdnUrl);

  if (await artifactExists(db, slug, downloaded.contentHash)) {
    return null;
  }

  const fullText = await extractPdfText(downloaded.bytes);
  const parsed = parseSubpoenaFields(item, fullText);
  const sources = loadSources();

  const [row] = await db
    .insert(artifacts)
    .values({
      type: "subpoena",
      status: "ingested",
      sensitivity: "public",
      title: titleFromRecipient(item.recipient),
      slug,
      sourceUrl: item.url,
      blobUrl: item.cdnUrl ?? downloaded.finalUrl,
      contentHash: downloaded.contentHash,
      publishedAt: publishedAtFromIssuedDate(sources.subpoenas.issuedDate),
      fullText,
      metadata: {
        recipient: parsed.recipient,
        aliases: parsed.aliases,
        issuedDate: parsed.issuedDate,
        complianceDeadline: parsed.complianceDeadline,
        requestedRecordTypes: parsed.requestedRecordTypes,
        manifestId: item.id,
        cdnUrl: item.cdnUrl,
      },
    })
    .returning({ id: artifacts.id, slug: artifacts.slug });

  return {
    id: row.id,
    slug: row.slug,
    recipient: item.recipient,
    isNew: true,
  };
}

export async function ingestSubpoenas(db: Database): Promise<IngestSubpoenasResult> {
  const items = getSubpoenaItems();
  const ingested: IngestedSubpoena[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    try {
      const result = await ingestSubpoenaItem(db, item);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(item.id);
      }
    } catch (error) {
      errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}

export async function ingestSubpoenaUrls(
  db: Database,
  urls: string[],
): Promise<IngestSubpoenasResult> {
  const manifest = getSubpoenaItems();
  const manifestByUrl = new Map(manifest.map((item) => [item.url, item]));
  const ingested: IngestedSubpoena[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const url of urls) {
    const item = manifestByUrl.get(url);
    if (!item) {
      errors.push({ id: url, error: "No manifest entry for discovered URL" });
      continue;
    }

    try {
      const result = await ingestSubpoenaItem(db, item);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(item.id);
      }
    } catch (error) {
      errors.push({
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}
