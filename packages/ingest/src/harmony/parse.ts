import { createHash } from "node:crypto";
import type {
  ParsedCaptionSegment,
  ParsedTranscript,
  RawCaptionSegment,
  TranscriptParagraph,
} from "./types";

const TRIGGER_WARNING_PATTERNS = [
  /\bsexual assault\b/i,
  /\bactivating\b/i,
  /\bpainful\b/i,
  /\bcontent warning\b/i,
  /\bmental health\b/i,
  /\bsurvivor\b/i,
  /\babuse\b/i,
];

export function extractCaptionArray(data: Record<string, unknown>): RawCaptionSegment[] {
  for (const value of Object.values(data)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0] as Record<string, unknown>;
    if (typeof first.Begin === "string" && typeof first.Content === "string") {
      return value as RawCaptionSegment[];
    }
  }

  return [];
}

function detectContentWarning(segments: ParsedCaptionSegment[]): boolean {
  const earlyText = segments
    .slice(0, 30)
    .map((segment) => segment.content)
    .join(" ");

  return TRIGGER_WARNING_PATTERNS.some((pattern) => pattern.test(earlyText));
}

function mergeParagraphs(segments: ParsedCaptionSegment[]): TranscriptParagraph[] {
  const paragraphs: TranscriptParagraph[] = [];
  let current: TranscriptParagraph | null = null;

  for (const segment of segments) {
    const shouldStartNew =
      !current ||
      segment.secondsFromStart - current.endSeconds > 3 ||
      current.text.length > 400;

    if (shouldStartNew) {
      if (current) paragraphs.push(current);
      current = {
        beginSeconds: segment.secondsFromStart,
        endSeconds: segment.secondsFromStart,
        text: segment.content,
      };
      continue;
    }

    if (!current) continue;

    current.endSeconds = segment.secondsFromStart;
    current.text = `${current.text} ${segment.content}`.trim();
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

export function parseClosedCaptions(
  data: Record<string, unknown>,
  meetingStartTime: string,
): ParsedTranscript {
  const rawSegments = extractCaptionArray(data);
  if (rawSegments.length === 0) {
    throw new Error("No caption segments found in Harmony response");
  }

  const startMs = new Date(meetingStartTime).getTime();
  const segments: ParsedCaptionSegment[] = rawSegments.map((segment, index) => {
    const beginAt = new Date(segment.Begin);
    const endAt = new Date(segment.End);
    const secondsFromStart = Math.max(0, (beginAt.getTime() - startMs) / 1000);

    return {
      sequence: index,
      beginAt,
      endAt,
      content: segment.Content.trim(),
      secondsFromStart,
    };
  });

  const paragraphs = mergeParagraphs(segments);
  const fullText = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  const contentHash = createHash("sha256")
    .update(JSON.stringify(rawSegments))
    .digest("hex");
  const contentWarning = detectContentWarning(segments);

  return {
    segments,
    paragraphs,
    fullText,
    contentHash,
    contentWarning,
    sensitivity: contentWarning ? "survivor_testimony" : "public",
  };
}

export function slugFromMeetingId(meetingId: string): string {
  return `${meetingId}-transcript`;
}
