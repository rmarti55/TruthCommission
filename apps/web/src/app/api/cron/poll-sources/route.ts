import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isCronAuthorized } from "@/lib/env";
import { pollAllSources } from "@truth-commission/ingest";
import { pollRuns } from "@truth-commission/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    const results = await pollAllSources();
    const db = getDb();

    if (db) {
      await db.insert(pollRuns).values({
        source: "all",
        startedAt,
        finishedAt: new Date(),
        success: true,
        newArtifacts: 0,
        details: results,
      });
    }

    return NextResponse.json({
      ok: true,
      polledAt: startedAt.toISOString(),
      results,
      persisted: Boolean(db),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown poll error";
    const db = getDb();

    if (db) {
      await db.insert(pollRuns).values({
        source: "all",
        startedAt,
        finishedAt: new Date(),
        success: false,
        details: { error: message },
      });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
