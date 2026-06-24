"use client";

import { LiveClock } from "@/components/LiveClock";
import { gateStreamUrl } from "@/lib/api";

interface LiveStreamViewProps {
  gateId: string;
  streamError: boolean;
  onStreamError: () => void;
  onClearError: () => void;
  onBackToAll: () => void;
}

export function LiveStreamView({
  gateId,
  streamError,
  onStreamError,
  onClearError,
  onBackToAll,
}: LiveStreamViewProps) {
  if (streamError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <svg className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909"
          />
        </svg>
        <p className="text-sm text-gray-600">Stream unavailable</p>
        <div className="flex gap-2">
          <button
            onClick={onClearError}
            className="rounded border border-blue-600/30 bg-blue-700/30 px-3 py-1.5 text-xs text-blue-300 transition-colors hover:bg-blue-700/50"
          >
            Retry
          </button>
          <button
            onClick={onBackToAll}
            className="rounded border border-gray-600/30 bg-gray-700/30 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-700/50"
          >
            All Gates
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <img
        src={gateStreamUrl(gateId)}
        alt="Live camera feed"
        className="h-full w-full object-contain"
        onError={onStreamError}
      />
      <div className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 font-mono text-xs text-white/70">
        <LiveClock
          mode="datetime"
          options={{ year: "numeric", month: "2-digit", day: "2-digit", hour12: false }}
        />
      </div>
      {[
        "top-2 left-2 border-t border-l",
        "top-2 right-2 border-t border-r",
        "bottom-2 left-2 border-b border-l",
        "bottom-2 right-2 border-b border-r",
      ].map((cls, i) => (
        <div key={i} className={`absolute h-4 w-4 border-blue-400/60 ${cls}`} />
      ))}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-[10px] font-semibold tracking-wider text-white/80">LIVE</span>
      </div>
      <button
        onClick={onBackToAll}
        className="absolute right-3 top-3 rounded border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-black/80 hover:text-gray-200"
      >
        ← All Gates
      </button>
    </>
  );
}
