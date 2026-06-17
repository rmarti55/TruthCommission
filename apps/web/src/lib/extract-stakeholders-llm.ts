import { generateObject } from "ai";
import { z } from "zod";
import { artifacts, captionSegments, type Database } from "@truth-commission/db";
import { eq, isNotNull } from "drizzle-orm";
import { upsertDiscoveredEmail } from "@truth-commission/ingest";
import { getSummaryModel } from "./ai-model";

const CHUNK_SIZE = 50_000;

const stakeholderSchema = z.object({
  organizations: z
    .array(
      z.object({
        name: z.string(),
        category: z
          .enum([
            "subpoena_recipient",
            "legislature",
            "commission",
            "federal_agency",
            "advocacy",
            "media",
            "legal",
            "other",
          ])
          .optional(),
        website: z.string().optional(),
      }),
    )
    .default([]),
  people: z
    .array(
      z.object({
        name: z.string(),
        title: z.string().optional(),
        organization: z.string().optional(),
        emails: z.array(z.string()).default([]),
        confidence: z.number().min(0).max(100).default(40),
      }),
    )
    .default([]),
  affiliations: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
      }),
    )
    .default([]),
});

export type StakeholderExtraction = z.infer<typeof stakeholderSchema>;

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [text];
}

async function extractFromChunk(
  text: string,
  context: string,
): Promise<StakeholderExtraction | null> {
  const model = getSummaryModel();
  if (!model) return null;

  const { object } = await generateObject({
    model,
    schema: stakeholderSchema,
    prompt: `Extract stakeholders from this New Mexico Survivors' Truth Commission document.
Focus on named individuals, organizations, and any email addresses explicitly mentioned.
Do not invent emails — only include addresses that appear in the text.
Context: ${context}

Document excerpt:
${text}`,
  });

  return object;
}

export async function runLlmStakeholderExtraction(
  db: Database,
): Promise<{ people: number; results: number }> {
  const model = getSummaryModel();
  if (!model) {
    return { people: 0, results: 0 };
  }

  let peopleCount = 0;
  let resultsCount = 0;

  const artifactRows = await db
    .select({
      id: artifacts.id,
      title: artifacts.title,
      fullText: artifacts.fullText,
      sourceUrl: artifacts.sourceUrl,
      metadata: artifacts.metadata,
    })
    .from(artifacts)
    .where(isNotNull(artifacts.fullText));

  for (const row of artifactRows) {
    if (!row.fullText) continue;
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const recipient =
      typeof metadata.recipient === "string" ? metadata.recipient : row.title;

    for (const chunk of chunkText(row.fullText)) {
      const extracted = await extractFromChunk(chunk, `${row.title} (${recipient})`);
      if (!extracted) continue;

      for (const person of extracted.people) {
        peopleCount += 1;
        const emails =
          person.emails.length > 0
            ? person.emails
            : [];

        if (emails.length === 0) continue;

        for (const email of emails) {
          const result = await upsertDiscoveredEmail(db, {
            email,
            sourceType: "llm_extract",
            sourceUrl: row.sourceUrl,
            artifactId: row.id,
            snippet: `${person.name}${person.title ? ` — ${person.title}` : ""}`,
            confidence: person.confidence,
            contactName: person.name,
            contactTitle: person.title,
            organizationName: person.organization ?? recipient,
          });
          if (result.action !== "skipped") resultsCount += 1;
        }
      }
    }
  }

  const segments = await db
    .select({
      artifactId: captionSegments.artifactId,
      content: captionSegments.content,
    })
    .from(captionSegments);

  const byArtifact = new Map<string, string>();
  for (const seg of segments) {
    byArtifact.set(seg.artifactId, (byArtifact.get(seg.artifactId) ?? "") + " " + seg.content);
  }

  for (const [artifactId, text] of byArtifact) {
    const [artifact] = await db
      .select({ title: artifacts.title, sourceUrl: artifacts.sourceUrl })
      .from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .limit(1);

    for (const chunk of chunkText(text)) {
      const extracted = await extractFromChunk(
        chunk,
        `Meeting transcript: ${artifact?.title ?? artifactId}`,
      );
      if (!extracted) continue;

      for (const person of extracted.people) {
        peopleCount += 1;
        for (const email of person.emails) {
          const result = await upsertDiscoveredEmail(db, {
            email,
            sourceType: "llm_extract",
            sourceUrl: artifact?.sourceUrl,
            artifactId,
            snippet: `${person.name}${person.title ? ` — ${person.title}` : ""}`,
            confidence: Math.min(person.confidence, 45),
            contactName: person.name,
            contactTitle: person.title,
            organizationName: person.organization,
          });
          if (result.action !== "skipped") resultsCount += 1;
        }
      }
    }
  }

  return { people: peopleCount, results: resultsCount };
}
