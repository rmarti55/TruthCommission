import { generateObject } from "ai";
import { z } from "zod";
import type { Artifact } from "@truth-commission/db";
import { getSummaryModel } from "./ai-model";

const summarySchema = z.object({
  summaryShort: z
    .string()
    .describe("Neutral factual summary, about 150 words, suitable for email alerts"),
  summaryLong: z
    .string()
    .describe("Longer neutral archive summary with key moments and context"),
});

export type MeetingSummaries = z.infer<typeof summarySchema>;

export async function summarizeMeeting(
  artifact: Pick<Artifact, "title" | "fullText" | "metadata">,
): Promise<MeetingSummaries | null> {
  const model = getSummaryModel();
  if (!model || !artifact.fullText) return null;

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const meetingDate = String(metadata.meetingDate ?? "see document");
  const contentWarning = Boolean(metadata.contentWarning);

  const { object } = await generateObject({
    model,
    schema: summarySchema,
    prompt: `Write neutral, factual summaries of this New Mexico Survivors' Truth Commission meeting transcript.
Do not use sensational language. Highlight procedural updates, subpoena announcements, helpline information, and commissioner introductions when present.
${contentWarning ? "Note that the meeting includes a survivor content warning at the opening." : ""}

Meeting: ${artifact.title}
Date: ${meetingDate}

Transcript excerpt:
${artifact.fullText.slice(0, 12000)}`,
  });

  return object;
}
