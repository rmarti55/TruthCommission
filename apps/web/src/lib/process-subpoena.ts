import { artifacts, subscribers, type Database } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import type { IngestedSubpoena } from "@truth-commission/ingest";
import {
  buildUnsubscribeUrl,
  sendNewSubpoenaAlert,
} from "./email";
import { env } from "./env";
import { summarizeSubpoena } from "./summarize";

export async function finalizeIngestedSubpoenas(
  db: Database,
  ingested: IngestedSubpoena[],
) {
  const results = [];

  for (const item of ingested) {
    const result = await finalizeSubpoena(db, item.id);
    results.push({ slug: item.slug, ...result });
  }

  return results;
}

export async function finalizeSubpoena(db: Database, artifactId: string) {
  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1);

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const recipient = String(metadata.recipient ?? artifact.title);
  const complianceDeadline = String(metadata.complianceDeadline ?? "see document");

  let summaryShort = artifact.summaryShort;
  let summaryLong = artifact.summaryLong;
  let status: "processed" | "published" = "published";

  const summaries = await summarizeSubpoena(artifact);
  if (summaries) {
    summaryShort = summaries.summaryShort;
    summaryLong = summaries.summaryLong;
    status = "processed";
  }

  await db
    .update(artifacts)
    .set({
      summaryShort: summaryShort ?? null,
      summaryLong: summaryLong ?? null,
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(artifacts.id, artifactId));

  const alertsSent = await notifySubscribers(db, {
    recipient,
    complianceDeadline,
    summaryShort:
      summaryShort ??
      `A new subpoena to ${recipient} was published. Compliance deadline: ${complianceDeadline}.`,
    slug: artifact.slug,
  });

  return { status, summarized: Boolean(summaries), alertsSent };
}

async function notifySubscribers(
  db: Database,
  params: {
    recipient: string;
    complianceDeadline: string;
    summaryShort: string;
    slug: string;
  },
) {
  const activeSubscribers = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  const artifactUrl = `${env.appUrl()}/artifacts/${params.slug}`;
  let sent = 0;

  for (const subscriber of activeSubscribers) {
    if (!subscriber.instantAlerts) continue;

    await sendNewSubpoenaAlert({
      email: subscriber.email,
      recipient: params.recipient,
      complianceDeadline: params.complianceDeadline,
      summaryShort: params.summaryShort,
      artifactUrl,
      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
    });
    sent += 1;
  }

  return sent;
}
