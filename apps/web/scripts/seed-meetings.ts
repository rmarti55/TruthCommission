import { config } from "dotenv";
import { resolve } from "node:path";
import { createDb } from "@truth-commission/db";
import { ingestHarmonyMeetings } from "@truth-commission/ingest";
import { finalizeIngestedMeetings } from "../src/lib/process-meeting";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const db = createDb(postgresUrl);
  const result = await ingestHarmonyMeetings(db);

  console.log("Seed meetings ingest:");
  console.log(`  ingested: ${result.ingested.length}`);
  console.log(`  skipped: ${result.skipped.length}`);
  console.log(`  errors: ${result.errors.length}`);

  if (result.ingested.length > 0) {
    const finalized = await finalizeIngestedMeetings(db, result.ingested);
    console.log("Published:", finalized);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`  - ${error.id}: ${error.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
