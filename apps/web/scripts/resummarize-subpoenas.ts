import { config } from "dotenv";
import { resolve } from "node:path";
import { artifacts, createDb, siteContent } from "@truth-commission/db";
import { and, eq } from "drizzle-orm";
import { updateSubpoenaSummaries } from "../src/lib/process-subpoena";
import {
  SUBPOENA_BATCH_CONTENT_KEY,
  summarizeSubpoenaBatch,
  type SubpoenaBatchInput,
} from "../src/lib/summarize-subpoena-batch";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const db = createDb(postgresUrl);
  const published = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.type, "subpoena"), eq(artifacts.status, "published")));

  console.log(`Re-summarizing ${published.length} published subpoenas...`);

  const results = [];
  for (const artifact of published) {
    try {
      const result = await updateSubpoenaSummaries(db, artifact.id);
      results.push(result);
      console.log(`  ${result.slug}: ${result.summarized ? "summarized" : "skipped (no model or text)"}`);
    } catch (error) {
      console.error(`  ${artifact.slug}: failed`, error);
      results.push({ slug: artifact.slug, summarized: false });
    }
  }

  const refreshed = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.type, "subpoena"), eq(artifacts.status, "published")));

  const batchInput: SubpoenaBatchInput[] = refreshed
    .filter((artifact) => artifact.summaryLong)
    .map((artifact) => {
      const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
      return {
        recipient: String(metadata.recipient ?? artifact.title),
        issuedDate: String(metadata.issuedDate ?? ""),
        complianceDeadline: String(metadata.complianceDeadline ?? ""),
        requestedRecordTypes: Array.isArray(metadata.requestedRecordTypes)
          ? (metadata.requestedRecordTypes as string[])
          : [],
        summaryLong: artifact.summaryLong ?? "",
      };
    });

  if (batchInput.length > 0) {
    const batchSummaries = await summarizeSubpoenaBatch(batchInput);
    if (batchSummaries) {
      await db
        .insert(siteContent)
        .values({
          key: SUBPOENA_BATCH_CONTENT_KEY,
          value: {
            summaryShort: batchSummaries.summaryShort,
            summaryLong: batchSummaries.summaryLong,
            generatedAt: new Date().toISOString(),
            subpoenaCount: batchInput.length,
          },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteContent.key,
          set: {
            value: {
              summaryShort: batchSummaries.summaryShort,
              summaryLong: batchSummaries.summaryLong,
              generatedAt: new Date().toISOString(),
              subpoenaCount: batchInput.length,
            },
            updatedAt: new Date(),
          },
        });
      console.log(`Batch overview saved (${batchInput.length} subpoenas).`);
    } else {
      console.log("Batch overview skipped (no model available).");
    }
  } else {
    console.log("Batch overview skipped (no individual summaries generated).");
  }

  const summarized = results.filter((result) => result.summarized).length;
  console.log(`Done: ${summarized}/${published.length} subpoenas summarized.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
