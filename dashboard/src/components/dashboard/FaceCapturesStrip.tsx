"use client";

import { IconFace } from "@/components/icons";
import { CaptureThumb } from "@/components/face-display";
import type { GateEvent } from "@/lib/api";

interface FaceCapturesStripProps {
  recentCaptures: GateEvent[];
  todayCount: number;
  onClear: () => void;
}

export function FaceCapturesStrip({ recentCaptures, todayCount, onClear }: FaceCapturesStripProps) {
  return (
    <div className="shrink-0 border-b border-gv-border">
      <div className="flex items-center gap-2 border-b border-[#1e2d4a] bg-[#0a1020] px-4 py-2.5">
        <span className="text-blue-400">
          <IconFace />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-300">Face Captures</span>
        {todayCount > 0 && (
          <button
            onClick={onClear}
            className="rounded border border-red-800/30 px-1.5 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-950/50"
          >
            Clear
          </button>
        )}
        <span className="ml-auto rounded border border-blue-500/30 bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
          {todayCount}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 py-2.5">
        {recentCaptures.length > 0 ? (
          recentCaptures.map((e) => <CaptureThumb key={e.eventId} event={e} />)
        ) : (
          <p className="py-2 text-xs text-gray-600">
            No detections yet. Ensure the AI service is running and camera feed is active.
          </p>
        )}
      </div>
    </div>
  );
}
