import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isCronAuthorized } from "@/lib/env";
import { finalizeIngestedMeetings } from "@/lib/process-meeting";
import { finalizeIngestedSubpoenas } from "@/lib/process-subpoena";
import {
  extractHarmonyEventId,
  ingestHarmonyByEventIds,
  ingestSubpoenaUrls,
  normalizeHarmonyUrl,
  pollAllSources,
} from "@truth-commission/ingest";
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

    const harmonyUrls = [...results.commission.links, ...results.nmlegis.links]
      .filter((link) => link.kind === "harmony_recording")
      .map((link) => normalizeHarmonyUrl(link.url));

    const harmonyEventIds = harmonyUrls
      .map((url) => extractHarmonyEventId(url))
      .filter((id): id is string => Boolean(id));

    const subpoenaIngest = await ingestSubpoenaUrls(db, subpoenaUrls);
    const subpoenaFinalized =
      subpoenaIngest.ingested.length > 0
        ? await finalizeIngestedSubpoenas(db, subpoenaIngest.ingested)
        : [];

    const meetingIngest = await ingestHarmonyByEventIds(db, harmonyEventIds);
    const meetingFinalized =
      meetingIngest.ingested.length > 0
        ? await finalizeIngestedMeetings(db, meetingIngest.ingested)
        : [];

    const newArtifacts = subpoenaIngest.ingested.length + meetingIngest.ingested.length;

    await db.insert(pollRuns).values({
      source: "all",
      startedAt,
      finishedAt: new Date(),
      success: true,
      newArtifacts,
      details: {
        poll: results,
        subpoenaIngest,
        subpoenaFinalized,
        meetingIngest,
        meetingFinalized,
      },
    });

    return NextResponse.json({
      ok: true,
      polledAt: startedAt.toISOString(),
      results,
      subpoenaIngest,
      subpoenaFinalized,
      meetingIngest,
      meetingFinalized,
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
