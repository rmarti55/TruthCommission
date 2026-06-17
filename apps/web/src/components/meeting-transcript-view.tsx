"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ContentWarning } from "@/components/ui/content-warning";
import { MeetingVideoPlayer } from "./meeting-video-player";

export type TranscriptSegment = {
  sequence: number;
  beginAt: string;
  content: string;
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

export function MeetingTranscriptView({
  streamUrl,
  startTime,
  segments,
  contentWarning,
}: {
  streamUrl: string;
  startTime: string;
  segments: TranscriptSegment[];
  contentWarning?: boolean;
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
    <div className="space-y-6">
      <MeetingVideoPlayer streamUrl={streamUrl} onReady={handleReady} />

      {contentWarning ? (
        <ContentWarning>
          Content warning: this meeting includes discussion of sexual assault and survivor
          testimony.
        </ContentWarning>
      ) : null}

      <div>
        <label className="font-sans text-sm text-muted" htmlFor="transcript-search">
          Search transcript
        </label>
        <input
          id="transcript-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter captions..."
          className="input-field mt-2 w-full"
        />
      </div>

      <ol className="max-h-[32rem] space-y-2 overflow-auto rounded-sm border border-border bg-surface-muted p-4">
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
    </div>
  );
}
