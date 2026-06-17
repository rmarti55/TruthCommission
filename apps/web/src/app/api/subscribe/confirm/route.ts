import { getDb } from "@/lib/db";
import { subscribers } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${env.appUrl()}/?subscribe=missing-token`);
  }

  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.confirmToken, token))
    .limit(1);

  if (!subscriber) {
    return NextResponse.redirect(`${env.appUrl()}/?subscribe=invalid-token`);
  }

  await db
    .update(subscribers)
    .set({
      status: "active",
      confirmToken: null,
      confirmedAt: new Date(),
    })
    .where(eq(subscribers.id, subscriber.id));

  return NextResponse.redirect(`${env.appUrl()}/?subscribe=confirmed`);
}
