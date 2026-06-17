import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { Artifact } from "@truth-commission/db";

const summarySchema = z.object({
  summaryShort: z
    .string()
    .describe("Neutral factual summary, about 150 words, suitable for email alerts"),
  summaryLong: z
    .string()
    .describe("Longer neutral archive summary with key dates and requested records"),
});

export type SubpoenaSummaries = z.infer<typeof summarySchema>;

function getModel() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;

  const openai = createOpenAI({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/v1",
  });

  return openai("gpt-4o-mini");
}

export async function summarizeSubpoena(
  artifact: Pick<Artifact, "title" | "fullText" | "metadata">,
): Promise<SubpoenaSummaries | null> {
  const model = getModel();
  if (!model || !artifact.fullText) return null;

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const recipient = String(metadata.recipient ?? artifact.title);
  const complianceDeadline = String(metadata.complianceDeadline ?? "see document");

  const { object } = await generateObject({
    model,
    schema: summarySchema,
    prompt: `Write neutral, factual summaries of this New Mexico Survivors' Truth Commission subpoena.
Do not use sensational language. Stick to who was subpoenaed, when it was issued, the compliance deadline, and what categories of records are requested.

Recipient: ${recipient}
Compliance deadline: ${complianceDeadline}

Full subpoena text:
${artifact.fullText.slice(0, 12000)}`,
  });

  return object;
}
