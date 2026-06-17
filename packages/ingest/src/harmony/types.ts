export type RawCaptionSegment = {
  Begin: string;
  End: string;
  Content: string;
};

export type ParsedCaptionSegment = {
  sequence: number;
  beginAt: Date;
  endAt: Date;
  content: string;
  secondsFromStart: number;
};

export type TranscriptParagraph = {
  beginSeconds: number;
  endSeconds: number;
  text: string;
};

export type ParsedTranscript = {
  segments: ParsedCaptionSegment[];
  paragraphs: TranscriptParagraph[];
  fullText: string;
  contentHash: string;
  contentWarning: boolean;
  sensitivity: "public" | "survivor_testimony";
};
