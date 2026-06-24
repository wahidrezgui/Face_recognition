"use client";

import type { GateEvent } from "@/lib/api";
import { IconTarget } from "@/components/icons";
import { EventCard } from "@/components/face-display";

const SCROLL_STYLE = { scrollbarWidth: "thin" as const, scrollbarColor: "#1e2d4a transparent" };

type TargetAnalysisPanelProps = {
  events: GateEvent[];
  sseConnected: boolean;
  sseError: boolean;
  needsGate: boolean;
  lastEventAt: number | null;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
      <IconTarget />
      <p className="text-xs text-gray-600">{message}</p>
    </div>
  );
}

function emptyMessage(
  sseConnected: boolean,
  sseError: boolean,
  lastEventAt: number | null,
): string {
  if (sseError) return "Live stream disconnected — reconnecting…";
  if (sseConnected) {
    if (lastEventAt === null) {
      return "Connected — waiting for next identification…";
    }
    return "Connected — no matches in the current lookback window";
  }
  return "Connecting to live stream…";
}

export function TargetAnalysisPanel({
  events,
  sseConnected,
  sseError,
  needsGate,
  lastEventAt,
}: TargetAnalysisPanelProps) {
  return (
    <aside className="flex max-h-[40vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-2 lg:max-h-none xl:col-start-3 xl:row-start-1">
      <div className="flex items-center gap-2 border-b border-[#1e2d4a] bg-[#0a1020] px-4 py-2.5">
        <span className="text-blue-400">
          <IconTarget />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-300">
          Target Analysis
        </span>
        <span
          className={`ml-2 inline-flex items-center gap-1 text-[10px] ${sseConnected ? "text-emerald-400" : "text-gray-500"}`}
          title={sseConnected ? "Live SSE connected" : "Live SSE disconnected"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sseConnected ? "bg-emerald-400" : "bg-gray-600"}`} />
          Live
        </span>
        <span className="ml-auto rounded border border-blue-500/30 bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
          {events.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pt-2" style={SCROLL_STYLE}>
        {events.length > 0 ? (
          events.slice(0, 50).map((e) => <EventCard key={e.eventId} event={e} />)
        ) : needsGate ? (
          <EmptyState message="Select a gate in the sidebar for live identifications" />
        ) : (
          <EmptyState message={emptyMessage(sseConnected, sseError, lastEventAt)} />
        )}
      </div>
    </aside>
  );
}
