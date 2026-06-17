import { artifacts, captionSegments, type Database } from "@truth-commission/db";
import { eq, isNotNull } from "drizzle-orm";
import { extractEmailsFromText } from "./extract-emails";
import { upsertDiscoveredEmail, type UpsertEmailResult } from "./upsert";

export async function extractEmailsFromArtifacts(
  db: Database,
): Promise<{ artifacts: number; results: UpsertEmailResult[] }> {
  const rows = await db
    .select({
      id: artifacts.id,
      title: artifacts.title,
      fullText: artifacts.fullText,
      sourceUrl: artifacts.sourceUrl,
      metadata: artifacts.metadata,
    })
    .from(artifacts)
    .where(isNotNull(artifacts.fullText));

  const results: UpsertEmailResult[] = [];

  for (const row of rows) {
    if (!row.fullText) continue;
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const recipient = typeof metadata.recipient === "string" ? metadata.recipient : undefined;

    const emails = extractEmailsFromText(row.fullText, { confidence: 75 });
    for (const item of emails) {
      const result = await upsertDiscoveredEmail(db, {
        email: item.email,
        sourceType: "document_text",
        sourceUrl: row.sourceUrl,
        artifactId: row.id,
        snippet: item.snippet,
        confidence: item.confidence,
        organizationName: recipient,
      });
      results.push(result);
    }
  }

  return { artifacts: rows.length, results };
}

export async function extractEmailsFromTranscripts(
  db: Database,
): Promise<{ segments: number; results: UpsertEmailResult[] }> {
  const segments = await db
    .select({
      artifactId: captionSegments.artifactId,
      content: captionSegments.content,
    })
    .from(captionSegments);

  const byArtifact = new Map<string, string[]>();
  for (const seg of segments) {
    const list = byArtifact.get(seg.artifactId) ?? [];
    list.push(seg.content);
    byArtifact.set(seg.artifactId, list);
  }

  const results: UpsertEmailResult[] = [];
  let segmentCount = 0;

  for (const [artifactId, contents] of byArtifact) {
    const text = contents.join(" ");
    segmentCount += contents.length;
    const emails = extractEmailsFromText(text, { confidence: 55 });
    for (const item of emails) {
      const result = await upsertDiscoveredEmail(db, {
        email: item.email,
        sourceType: "document_text",
        artifactId,
        snippet: item.snippet,
        confidence: item.confidence,
      });
      results.push(result);
    }
  }

  return { segments: segmentCount, results };
}

export async function extractEmailsFromArtifactById(
  db: Database,
  artifactId: string,
): Promise<UpsertEmailResult[]> {
  const [row] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1);

  if (!row?.fullText) return [];

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const recipient = typeof metadata.recipient === "string" ? metadata.recipient : undefined;
  const results: UpsertEmailResult[] = [];

  for (const item of extractEmailsFromText(row.fullText, { confidence: 75 })) {
    results.push(
      await upsertDiscoveredEmail(db, {
        email: item.email,
        sourceType: "document_text",
        sourceUrl: row.sourceUrl,
        artifactId: row.id,
        snippet: item.snippet,
        confidence: item.confidence,
        organizationName: recipient,
      }),
    );
  }

  return results;
}
