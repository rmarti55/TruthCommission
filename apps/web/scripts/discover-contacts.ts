import { config } from "dotenv";
import { resolve } from "node:path";
import { createDb } from "@truth-commission/db";
import { discoverContacts } from "../src/lib/discover-contacts";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const skipCrawl = process.argv.includes("--skip-crawl");
  const skipLlm = process.argv.includes("--skip-llm");
  const skipDocuments = process.argv.includes("--skip-documents");

  const db = createDb(postgresUrl);
  const result = await discoverContacts(db, { skipCrawl, skipLlm, skipDocuments });

  console.log("Contact discovery complete:");
  console.log(`  seeded organizations: ${result.seededOrganizations}`);
  console.log(`  documents ingested: ${result.documentIngest.ingested.length}`);
  console.log(`  artifact emails: ${result.artifactExtract.results.length}`);
  console.log(`  transcript emails: ${result.transcriptExtract.results.length}`);
  if (result.officialCrawl) {
    console.log(`  official page emails: ${result.officialCrawl.results.length}`);
  }
  if (result.orgCrawl) {
    console.log(`  org crawl emails: ${result.orgCrawl.results.length}`);
  }
  if (result.llmExtract) {
    console.log(`  LLM people: ${result.llmExtract.people}, emails: ${result.llmExtract.results}`);
  }
  console.log(`  email stats:`, result.emailStats);

  if (result.documentIngest.errors.length > 0) {
    for (const error of result.documentIngest.errors) {
      console.error(`  doc error - ${error.id}: ${error.error}`);
    }
  }
  if (result.orgCrawl?.errors.length) {
    for (const error of result.orgCrawl.errors.slice(0, 10)) {
      console.error(`  crawl error - ${error}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
