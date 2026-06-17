import { config } from "dotenv";
import { resolve } from "node:path";
import { artifacts, createDb } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { finalizeMeeting } from "../src/lib/process-meeting";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required (set in apps/web/.env.local)");
  }

  const db = createDb(postgresUrl);
  const transcripts = await db
    .select({ id: artifacts.id, slug: artifacts.slug })
    .from(artifacts)
    .where(eq(artifacts.type, "meeting_transcript"));

  console.log(`Generating summaries for ${transcripts.length} meeting transcripts...`);

  for (const transcript of transcripts) {
    const result = await finalizeMeeting(db, transcript.id, { notify: false });
    console.log(`  ${transcript.slug}:`, result);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
