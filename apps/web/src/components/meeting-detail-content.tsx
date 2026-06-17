"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ContentWarning } from "@/components/ui/content-warning";
import { MeetingVideoPlayer } from "./meeting-video-player";

export type TranscriptSegment = {
  sequence: number;
  beginAt: string;
  content: string;
};

export type TranscriptParagraph = {
  beginSeconds: number;
  endSeconds: number;
  text: string;
};

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function MeetingDetailContent({
  streamUrl,
  startTime,
  segments,
  paragraphs,
  contentWarning,
  summaryShort,
  summaryLong,
  fullText,
}: {
  streamUrl: string;
  startTime: string;
  segments: TranscriptSegment[];
  paragraphs?: TranscriptParagraph[];
  contentWarning?: boolean;
  summaryShort?: string | null;
  summaryLong?: string | null;
  fullText?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [query, setQuery] = useState("");
  const startMs = useMemo(() => new Date(startTime).getTime(), [startTime]);
  const handleReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  const enriched = useMemo(
    () =>
      segments.map((segment) => {
        const secondsFromStart = Math.max(
          0,
          (new Date(segment.beginAt).getTime() - startMs) / 1000,
        );
        return { ...segment, secondsFromStart };
      }),
    [segments, startMs],
  );

  const filtered = enriched.filter((segment) =>
    query ? segment.content.toLowerCase().includes(query.toLowerCase()) : true,
  );

  function seekTo(seconds: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    void videoRef.current.play();
  }

  return (
    <div className="space-y-12">
      {contentWarning ? (
        <ContentWarning>
          Content warning: this meeting includes discussion of sexual assault and survivor
          testimony.
        </ContentWarning>
      ) : null}

      <section>
        <h2 className="text-lg tracking-[-0.015em]">Recording</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          Official HISC webcast recording with embedded timecodes from Harmony SLIQ.
        </p>
        <div className="mt-4">
          <MeetingVideoPlayer streamUrl={streamUrl} onReady={handleReady} />
        </div>
      </section>

      <section className="panel">
        <h2 className="text-lg tracking-[-0.015em]">Summary</h2>
        {summaryShort ? (
          <p className="mt-3 font-sans text-base leading-7 text-text">{summaryShort}</p>
        ) : null}
        {summaryLong ? (
          <p className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-body">
            {summaryLong}
          </p>
        ) : (
          <p className="mt-3 font-sans text-sm text-muted">
            AI summary is not available yet. Captions and full transcript are below.
          </p>
        )}
      </section>

      {paragraphs && paragraphs.length > 0 ? (
        <section className="panel">
          <h2 className="text-lg tracking-[-0.015em]">Key moments</h2>
          <p className="mt-2 font-sans text-sm text-muted">
            Merged caption paragraphs — click a timestamp to jump in the recording.
          </p>
          <ol className="mt-4 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <li key={`${paragraph.beginSeconds}-${index}`} className="flex gap-3">
                <button
                  type="button"
                  onClick={() => seekTo(paragraph.beginSeconds)}
                  className="shrink-0 font-mono text-xs text-muted transition-base hover:text-text"
                >
                  {formatTimestamp(paragraph.beginSeconds)}
                </button>
                <p className="font-sans text-sm leading-7 text-text">{paragraph.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg tracking-[-0.015em]">Captions</h2>
        <p className="mt-2 font-sans text-sm text-muted">
          {segments.length} caption segments from GetClosedCaption — searchable with jump-to-moment
          timestamps.
        </p>

        <div className="mt-4">
          <label className="font-sans text-sm text-muted" htmlFor="transcript-search">
            Search captions
          </label>
          <input
            id="transcript-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter captions..."
            className="input-field mt-2 w-full"
          />
        </div>

        <ol className="mt-4 space-y-2 rounded-sm border border-border bg-surface-muted p-4">
          {filtered.map((segment) => (
            <li key={segment.sequence} className="flex gap-3 font-sans text-sm leading-6">
              <button
                type="button"
                onClick={() => seekTo(segment.secondsFromStart)}
                className="shrink-0 font-mono text-xs text-muted transition-base hover:text-text"
              >
                {formatTimestamp(segment.secondsFromStart)}
              </button>
              <span className="text-text">{segment.content}</span>
            </li>
          ))}
        </ol>
      </section>

      {fullText ? (
        <details className="panel">
          <summary className="cursor-pointer text-lg tracking-[-0.015em]">
            Full transcript text
          </summary>
          <pre className="mt-4 max-h-[48rem] overflow-auto whitespace-pre-wrap font-sans text-xs leading-6 text-muted">
            {fullText}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
