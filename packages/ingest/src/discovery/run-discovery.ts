import { discoveryRuns, type Database } from "@truth-commission/db";
import { getDocumentSeeds } from "../stakeholders";
import { ingestPdfDocumentsFromSeeds } from "../document/ingest-pdf";
import { crawlAllOrganizations } from "./crawl-org";
import { crawlOfficialPages } from "./crawl-official";
import {
  extractEmailsFromArtifacts,
  extractEmailsFromTranscripts,
} from "./extract-artifacts";
import { seedOrganizationsFromManifest } from "./upsert";

export type LlmStakeholderExtractor = (
  db: Database,
) => Promise<{ people: number; results: number }>;

export type ContactDiscoveryOptions = {
  skipCrawl?: boolean;
  skipDocuments?: boolean;
  skipLlm?: boolean;
  llmExtractor?: LlmStakeholderExtractor;
};

export type ContactDiscoveryResult = {
  seededOrganizations: number;
  documentIngest: Awaited<ReturnType<typeof ingestPdfDocumentsFromSeeds>>;
  artifactExtract: Awaited<ReturnType<typeof extractEmailsFromArtifacts>>;
  transcriptExtract: Awaited<ReturnType<typeof extractEmailsFromTranscripts>>;
  officialCrawl: Awaited<ReturnType<typeof crawlOfficialPages>> | null;
  orgCrawl: Awaited<ReturnType<typeof crawlAllOrganizations>> | null;
  llmExtract: { people: number; results: number } | null;
  emailStats: { created: number; updated: number; skipped: number };
};

function tallyResults(
  ...groups: Array<Array<{ action: string }> | null | undefined>
): { created: number; updated: number; skipped: number } {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const group of groups) {
    if (!group) continue;
    for (const item of group) {
      if (item.action === "created") created += 1;
      else if (item.action === "updated") updated += 1;
      else skipped += 1;
    }
  }
  return { created, updated, skipped };
}

export async function runContactDiscovery(
  db: Database,
  options: ContactDiscoveryOptions = {},
): Promise<ContactDiscoveryResult> {
  const startedAt = new Date();

  const seededOrganizations = await seedOrganizationsFromManifest(db);

  let documentIngest: ContactDiscoveryResult["documentIngest"] = {
    ingested: [],
    skipped: [],
    errors: [],
  };

  if (!options.skipDocuments) {
    const seeds = getDocumentSeeds().map((doc) => ({
      url: doc.url,
      type: doc.type as "agenda" | "handout" | "presentation",
      title: doc.title,
      slug: doc.id,
    }));
    documentIngest = await ingestPdfDocumentsFromSeeds(db, seeds);
  }

  const artifactExtract = await extractEmailsFromArtifacts(db);
  const transcriptExtract = await extractEmailsFromTranscripts(db);

  const officialCrawl = options.skipCrawl ? null : await crawlOfficialPages(db);
  const orgCrawl = options.skipCrawl ? null : await crawlAllOrganizations(db);

  let llmExtract: ContactDiscoveryResult["llmExtract"] = null;
  if (!options.skipLlm && options.llmExtractor) {
    llmExtract = await options.llmExtractor(db);
  }

  const emailStats = tallyResults(
    documentIngest.ingested.map(() => ({ action: "created" })),
    artifactExtract.results,
    transcriptExtract.results,
    officialCrawl?.results,
    orgCrawl?.results,
  );

  const result: ContactDiscoveryResult = {
    seededOrganizations,
    documentIngest,
    artifactExtract,
    transcriptExtract,
    officialCrawl,
    orgCrawl,
    llmExtract,
    emailStats,
  };

  await db.insert(discoveryRuns).values({
    startedAt,
    finishedAt: new Date(),
    success: true,
    details: result as unknown as Record<string, unknown>,
  });

  return result;
}
