"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TARGET_FRAMES = 5;
const CAPTURE_INTERVAL = 600; // ms between capture attempts

export function QuickCapture({
  onFramesReady,
  onCancel,
}: {
  onFramesReady: (frames: string[]) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    setFrames((prev) => {
      if (prev.length >= TARGET_FRAMES) return prev;
      const next = [...prev, b64];
      if (next.length >= TARGET_FRAMES) {
        // Got enough — stop camera and submit
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        setTimeout(() => onFramesReady(next), 100);
      }
      return next;
    });
  }, [onFramesReady]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        // Start capturing at intervals
        timerRef.current = setInterval(capture, CAPTURE_INTERVAL);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Camera access denied");
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [capture]);

  return (
    <div className="flex flex-col items-center gap-3">
      {error ? (
        <div className="text-xs text-red-400 text-center px-4 py-3 rounded" style={{ background: "#f8717115", border: "1px solid #f8717130" }}>
          <p className="mb-2">{error}</p>
          <p className="text-gray-500 text-[10px]">Camera permission may be needed. Check browser settings.</p>
          <button onClick={onCancel} className="mt-2 text-xs text-blue-400 underline">Go back</button>
        </div>
      ) : (
        <>
          {/* Video preview */}
          <div className="relative rounded-lg overflow-hidden" style={{ width: 240, height: 180, background: "#000" }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Frame count overlay */}
            <div className="absolute bottom-2 left-2 flex gap-1">
              {Array.from({ length: TARGET_FRAMES }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border transition-colors"
                  style={{
                    background: i < frames.length ? "#22d3a5" : "rgba(255,255,255,0.15)",
                    borderColor: i < frames.length ? "#22d3a5" : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
            {/* Count text */}
            <div className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.6)", color: frames.length >= TARGET_FRAMES ? "#22d3a5" : "#94a3b8" }}>
              {frames.length}/{TARGET_FRAMES}
            </div>
          </div>

          {frames.length > 0 && frames.length < TARGET_FRAMES && (
            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
                onFramesReady(frames);
              }}
              className="text-[10px] px-2 py-1 rounded border transition-colors"
              style={{ borderColor: "#1a2640", color: "#94a3b8" }}
            >
              Submit with {frames.length} frame{frames.length !== 1 ? "s" : ""}
            </button>
          )}

          {frames.length === 0 && (
            <p className="text-[10px] text-gray-600">Capturing frames… look at the camera</p>
          )}

          {frames.length > 0 && frames.length < TARGET_FRAMES && (
            <p className="text-[10px] text-gray-600">
              {frames.length === 0 ? "Look at the camera…" : `Captured ${frames.length}. Move your head slightly for different angles.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
