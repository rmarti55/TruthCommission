import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isCronAuthorized } from "@/lib/env";
import { finalizeIngestedSubpoenas } from "@/lib/process-subpoena";
import { ingestSubpoenaUrls, pollAllSources } from "@truth-commission/ingest";
import { pollRuns } from "@truth-commission/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const db = getDb();

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const results = await pollAllSources();
    const subpoenaUrls = results.commission.links
      .filter((link) => link.kind === "subpoena_pdf")
      .map((link) => link.url);

    const ingestResult = await ingestSubpoenaUrls(db, subpoenaUrls);
    const finalized =
      ingestResult.ingested.length > 0
        ? await finalizeIngestedSubpoenas(db, ingestResult.ingested)
        : [];

    await db.insert(pollRuns).values({
      source: "all",
      startedAt,
      finishedAt: new Date(),
      success: true,
      newArtifacts: ingestResult.ingested.length,
      details: {
        poll: results,
        ingest: ingestResult,
        finalized,
      },
    });

    return NextResponse.json({
      ok: true,
      polledAt: startedAt.toISOString(),
      results,
      ingest: ingestResult,
      finalized,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown poll error";

    await db.insert(pollRuns).values({
      source: "all",
      startedAt,
      finishedAt: new Date(),
      success: false,
      details: { error: message },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
