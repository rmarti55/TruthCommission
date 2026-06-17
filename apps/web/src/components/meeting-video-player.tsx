"use client";

import { useEffect, useRef } from "react";

export function MeetingVideoPlayer({
  streamUrl,
  onReady,
}: {
  streamUrl: string;
  onReady?: (video: HTMLVideoElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onReady?.(video);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      return;
    }

    let hls: { destroy: () => void } | undefined;

    void import("hls.js").then(({ default: Hls }) => {
      if (!videoRef.current) return;

      if (Hls.isSupported()) {
        const player = new Hls();
        player.loadSource(streamUrl);
        player.attachMedia(videoRef.current);
        hls = player;
      } else {
        videoRef.current.src = streamUrl;
      }
    });

    return () => {
      hls?.destroy();
    };
  }, [streamUrl, onReady]);

  return (
    <video
      ref={videoRef}
      controls
      className="aspect-video w-full rounded-sm border border-border bg-surface-muted"
      playsInline
    />
  );
}
