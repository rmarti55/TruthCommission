import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { buildConfirmUrl, sendSubscriberConfirmation } from "@/lib/email";
import { subscribers } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const confirmToken = randomBytes(24).toString("hex");
  const unsubscribeToken = randomBytes(24).toString("hex");

  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing[0]?.status === "active") {
    return NextResponse.json({ ok: true, message: "Already subscribed" });
  }

  if (existing[0]) {
    await db
      .update(subscribers)
      .set({
        status: "pending",
        confirmToken,
        instantAlerts: true,
      })
      .where(eq(subscribers.id, existing[0].id));
  } else {
    await db.insert(subscribers).values({
      email,
      status: "pending",
      confirmToken,
      unsubscribeToken,
      instantAlerts: true,
    });
  }

  const confirmUrl = buildConfirmUrl(confirmToken);
  await sendSubscriberConfirmation({ email, confirmUrl });

  return NextResponse.json({
    ok: true,
    message: "Check your email to confirm subscription",
  });
}
