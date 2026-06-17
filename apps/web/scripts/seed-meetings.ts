import { config } from "dotenv";
import { resolve } from "node:path";
import { createDb } from "@truth-commission/db";
import {
  getConfirmedAgendaUrls,
  ingestAgendaUrls,
  ingestHarmonyMeetings,
  syncMeetingsFromManifest,
} from "@truth-commission/ingest";
import { finalizeIngestedMeetings } from "../src/lib/process-meeting";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const db = createDb(postgresUrl);

  const syncResult = await syncMeetingsFromManifest(db);
  console.log("Sync meetings from manifest:");
  console.log(`  synced: ${syncResult.synced.length}`);
  console.log(`  errors: ${syncResult.errors.length}`);

  const agendaResult = await ingestAgendaUrls(db, getConfirmedAgendaUrls());
  console.log("Ingest agenda PDFs:");
  console.log(`  ingested: ${agendaResult.ingested.length}`);
  console.log(`  skipped: ${agendaResult.skipped.length}`);
  console.log(`  errors: ${agendaResult.errors.length}`);

  const result = await ingestHarmonyMeetings(db);

  console.log("Seed meetings ingest:");
  console.log(`  ingested: ${result.ingested.length}`);
  console.log(`  skipped: ${result.skipped.length}`);
  console.log(`  errors: ${result.errors.length}`);

  if (result.ingested.length > 0) {
    const finalized = await finalizeIngestedMeetings(db, result.ingested);
    console.log("Published:", finalized);
  }

  const allErrors = [...syncResult.errors, ...agendaResult.errors, ...result.errors];
  if (allErrors.length > 0) {
    for (const error of allErrors) {
      const id = "id" in error ? error.id : "url" in error ? error.url : "unknown";
      console.error(`  - ${id}: ${error.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
