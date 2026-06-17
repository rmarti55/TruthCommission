import { artifacts, subscribers, type Database } from "@truth-commission/db";
import { eq } from "drizzle-orm";
import type { IngestedMeeting } from "@truth-commission/ingest";
import { buildUnsubscribeUrl, sendNewMeetingAlert } from "./email";
import { env } from "./env";
import { summarizeMeeting } from "./summarize-meeting";

export async function finalizeIngestedMeetings(
  db: Database,
  ingested: IngestedMeeting[],
) {
  const results = [];

  for (const item of ingested) {
    const result = await finalizeMeeting(db, item.id);
    results.push({ slug: item.slug, ...result });
  }

  return results;
}

export async function finalizeMeeting(
  db: Database,
  artifactId: string,
  options?: { notify?: boolean },
) {
  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1);

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const meetingDate = String(metadata.meetingDate ?? "");

  let summaryShort = artifact.summaryShort;
  let summaryLong = artifact.summaryLong;

  const summaries = await summarizeMeeting(artifact);
  if (summaries) {
    summaryShort = summaries.summaryShort;
    summaryLong = summaries.summaryLong;
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

  const externalId = String(metadata.manifestId ?? artifact.slug.replace(/-transcript$/, ""));

  const alertsSent =
    options?.notify === false
      ? 0
      : await notifySubscribers(db, {
          title: artifact.title,
          meetingDate,
          summaryShort:
            summaryShort ??
            `A new meeting transcript was published: ${artifact.title}${meetingDate ? ` (${meetingDate})` : ""}.`,
          slug: artifact.slug,
          externalId,
        });

  return { summarized: Boolean(summaries), alertsSent };
}

async function notifySubscribers(
  db: Database,
  params: {
    title: string;
    meetingDate: string;
    summaryShort: string;
    slug: string;
    externalId: string;
  },
) {
  const activeSubscribers = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  const meetingUrl = `${env.appUrl()}/meetings/${params.externalId}`;
  const artifactUrl = `${env.appUrl()}/artifacts/${params.slug}`;
  let sent = 0;

  for (const subscriber of activeSubscribers) {
    if (!subscriber.instantAlerts) continue;

    await sendNewMeetingAlert({
      email: subscriber.email,
      title: params.title,
      meetingDate: params.meetingDate,
      summaryShort: params.summaryShort,
      meetingUrl,
      artifactUrl,
      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
    });
    sent += 1;
  }

  return sent;
}
