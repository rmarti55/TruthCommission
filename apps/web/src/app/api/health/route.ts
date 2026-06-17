import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/blob";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { loadSources } from "@truth-commission/ingest";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = loadSources();
  const db = getDb();
  let database: "connected" | "not_configured" | "error" = "not_configured";

  if (db) {
    try {
      await db.execute(sql`select 1`);
      database = "connected";
    } catch {
      database = "error";
    }
  }

  return NextResponse.json({
    ok: database === "connected",
    service: "nm-truth-commission-tracker",
    block: "C",
    database,
    blob: isBlobConfigured() ? "configured" : "not_configured",
    cronSecret: Boolean(env.cronSecret()),
    aiGateway: Boolean(process.env.AI_GATEWAY_API_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    recon: {
      subpoenas: sources.summary.subpoenasFound,
      meetings: sources.summary.meetingsCataloged,
      harmonyEvents: sources.summary.harmonyEventsValidated,
    },
  });
}
