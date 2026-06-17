import { config } from "dotenv";
import { resolve } from "node:path";
import { artifacts, createDb } from "@truth-commission/db";
import { inArray } from "drizzle-orm";
import { finalizeSubpoena } from "../src/lib/process-subpoena";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const db = createDb(postgresUrl);
  const pending = await db
    .select({ id: artifacts.id, slug: artifacts.slug })
    .from(artifacts)
    .where(inArray(artifacts.status, ["discovered", "ingested", "processed"]));

  console.log(`Publishing ${pending.length} artifacts...`);

  for (const artifact of pending) {
    const result = await finalizeSubpoena(db, artifact.id);
    console.log(`  ${artifact.slug}:`, result);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
