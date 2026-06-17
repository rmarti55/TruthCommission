import { generateObject } from "ai";
import { z } from "zod";
import { getSummaryModel } from "./ai-model";

export const SUBPOENA_BATCH_CONTENT_KEY = "subpoena_batch:2026-06";

const batchSummarySchema = z.object({
  summaryShort: z
    .string()
    .describe(
      "Neutral factual overview of the June 2026 subpoena batch, about 150 words, suitable for archive cards.",
    ),
  summaryLong: z
    .string()
    .describe(
      "Longer neutral overview in clear paragraphs: common issued date and compliance deadline; which New Mexico entities were targeted; overlapping record categories across subpoenas; notable differences in scope; what additional targets are still expected.",
    ),
});

export type SubpoenaBatchSummaries = z.infer<typeof batchSummarySchema>;

export type SubpoenaBatchInput = {
  recipient: string;
  issuedDate: string;
  complianceDeadline: string;
  requestedRecordTypes: string[];
  summaryLong: string;
};

const EXPECTED_ADDITIONAL_TARGETS = [
  "Epstein estate",
  "FBI",
  "U.S. Department of Justice",
  "U.S. Attorney Southern District of New York",
  "U.S. Attorney District of New Mexico",
  "Deutsche Bank",
  "J.P. Morgan Chase",
];

export async function summarizeSubpoenaBatch(
  subpoenas: SubpoenaBatchInput[],
): Promise<SubpoenaBatchSummaries | null> {
  const model = getSummaryModel();
  if (!model || subpoenas.length === 0) return null;

  const subpoenaSummaries = subpoenas
    .map(
      (item, index) =>
        `${index + 1}. ${item.recipient}
   Issued: ${item.issuedDate}
   Compliance deadline: ${item.complianceDeadline}
   Record categories: ${item.requestedRecordTypes.join(", ") || "see summary"}
   Summary: ${item.summaryLong}`,
    )
    .join("\n\n");

  const { object } = await generateObject({
    model,
    schema: batchSummarySchema,
    prompt: `Write neutral, factual summaries of the June 2026 batch of New Mexico Survivors' Truth Commission subpoenas.
Do not use sensational language. This is a holistic overview of ${subpoenas.length} subpoenas issued together.

Expected additional targets not yet published (mention briefly if relevant): ${EXPECTED_ADDITIONAL_TARGETS.join(", ")}.

Individual subpoena summaries:
${subpoenaSummaries}`,
  });

  return object;
}
