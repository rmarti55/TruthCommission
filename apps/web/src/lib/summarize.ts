import { generateObject } from "ai";
import { z } from "zod";
import type { Artifact } from "@truth-commission/db";
import { getSummaryModel } from "./ai-model";

const MAX_FULL_TEXT_CHARS = 200_000;

const summarySchema = z.object({
  summaryShort: z
    .string()
    .describe(
      "Neutral factual summary, about 150 words, suitable for email alerts. Cover who was subpoenaed, issued date, compliance deadline, and main record categories.",
    ),
  summaryLong: z
    .string()
    .describe(
      "Longer neutral archive summary in clear paragraphs covering: recipient and aliases; issued date and compliance deadline; scope of records requested (specific categories, named individuals or offices if mentioned); delivery or format requirements if stated; legal authority cited (e.g. HR1 resolution).",
    ),
});

export type SubpoenaSummaries = z.infer<typeof summarySchema>;

export async function summarizeSubpoena(
  artifact: Pick<Artifact, "title" | "fullText" | "metadata">,
): Promise<SubpoenaSummaries | null> {
  const model = getSummaryModel();
  if (!model || !artifact.fullText) return null;

  const metadata = (artifact.metadata ?? {}) as Record<string, unknown>;
  const recipient = String(metadata.recipient ?? artifact.title);
  const issuedDate = String(metadata.issuedDate ?? "see document");
  const complianceDeadline = String(metadata.complianceDeadline ?? "see document");
  const aliases = Array.isArray(metadata.aliases)
    ? (metadata.aliases as string[]).join(", ")
    : "";
  const requestedRecordTypes = Array.isArray(metadata.requestedRecordTypes)
    ? (metadata.requestedRecordTypes as string[]).join(", ")
    : "";

  const fullText = artifact.fullText.slice(0, MAX_FULL_TEXT_CHARS);

  const { object } = await generateObject({
    model,
    schema: summarySchema,
    prompt: `Write neutral, factual summaries of this New Mexico Survivors' Truth Commission subpoena duces tecum.
Do not use sensational language. Stick to documented facts from the subpoena text.

Recipient: ${recipient}${aliases ? `\nAlso known as: ${aliases}` : ""}
Issued: ${issuedDate}
Compliance deadline: ${complianceDeadline}
Detected record categories (may be incomplete): ${requestedRecordTypes || "see full text"}

For summaryLong, use clear paragraphs covering:
1. Who was subpoenaed (include aliases if relevant)
2. Issued date and compliance deadline
3. Scope of records requested — specific categories, named individuals or offices if mentioned
4. Delivery or format requirements if stated
5. Legal authority cited (e.g. HR1 resolution reference)

Full subpoena text:
${fullText}`,
  });

  return object;
}
