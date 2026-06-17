import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/blob";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { loadSources } from "@truth-commission/ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = loadSources();

  return NextResponse.json({
    ok: true,
    service: "nm-truth-commission-tracker",
    block: "B",
    database: getDb() ? "connected" : "not_configured",
    blob: isBlobConfigured() ? "configured" : "not_configured",
    cronSecret: Boolean(env.cronSecret()),
    recon: {
      subpoenas: sources.summary.subpoenasFound,
      meetings: sources.summary.meetingsCataloged,
      harmonyEvents: sources.summary.harmonyEventsValidated,
    },
  });
}
