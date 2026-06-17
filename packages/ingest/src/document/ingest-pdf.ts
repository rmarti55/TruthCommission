import { artifacts, type Database } from "@truth-commission/db";
import { eq, or } from "drizzle-orm";
import { downloadSubpoenaPdf } from "../subpoena/download";
import { extractPdfText } from "../subpoena/extract";

export type DocumentArtifactType = "agenda" | "handout" | "memo" | "presentation" | "report";

export type IngestPdfOptions = {
  url: string;
  type: DocumentArtifactType;
  title: string;
  slug?: string;
  cdnUrl?: string;
  metadata?: Record<string, unknown>;
  publishedAt?: Date;
};

export type IngestedDocument = {
  id: string;
  slug: string;
  isNew: boolean;
};

function slugFromUrl(url: string, type: DocumentArtifactType): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop()?.replace(/\.pdf$/i, "") ?? type;
    return `${type}-${base}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  } catch {
    return `${type}-${Date.now()}`;
  }
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

export async function ingestPdfDocument(
  db: Database,
  options: IngestPdfOptions,
): Promise<IngestedDocument | null> {
  const slug = options.slug ?? slugFromUrl(options.url, options.type);
  const downloaded = await downloadSubpoenaPdf(options.url, options.cdnUrl);

  if (await artifactExists(db, slug, downloaded.contentHash)) {
    return null;
  }

  const fullText = await extractPdfText(downloaded.bytes);

  const [row] = await db
    .insert(artifacts)
    .values({
      type: options.type,
      status: "ingested",
      sensitivity: "public",
      title: options.title,
      slug,
      sourceUrl: options.url,
      blobUrl: options.cdnUrl ?? downloaded.finalUrl,
      contentHash: downloaded.contentHash,
      publishedAt: options.publishedAt,
      fullText,
      metadata: options.metadata ?? {},
    })
    .returning({ id: artifacts.id, slug: artifacts.slug });

  return { id: row.id, slug: row.slug, isNew: true };
}

export async function ingestPdfDocumentsFromSeeds(
  db: Database,
  seeds: Array<{
    url: string;
    type: DocumentArtifactType;
    title: string;
    slug?: string;
    metadata?: Record<string, unknown>;
  }>,
): Promise<{ ingested: IngestedDocument[]; skipped: string[]; errors: Array<{ id: string; error: string }> }> {
  const ingested: IngestedDocument[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const seed of seeds) {
    try {
      const result = await ingestPdfDocument(db, seed);
      if (result) {
        ingested.push(result);
      } else {
        skipped.push(seed.slug ?? seed.url);
      }
    } catch (error) {
      errors.push({
        id: seed.slug ?? seed.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ingested, skipped, errors };
}
