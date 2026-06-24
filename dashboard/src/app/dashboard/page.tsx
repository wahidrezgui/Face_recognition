"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchPersonsCount, fetchEventStats, fetchGates } from "@/lib/api";
import { useDashboardEvents } from "@/hooks/useDashboardEvents";
import { LiveClock } from "@/components/LiveClock";
import { IconCamera, IconTarget, IconChart, IconShield, IconUsers, IconDot } from "@/components/icons";
import { PanelHeader, StatItem, EventCard } from "@/components/face-display";
import { GateSelectorList } from "@/components/dashboard/GateSelectorList";
import { FaceCapturesStrip } from "@/components/dashboard/FaceCapturesStrip";
import { LiveStreamView } from "@/components/dashboard/LiveStreamView";
import { DashboardGateCard } from "@/components/dashboard/DashboardGateCard";

export default function DashboardPage() {
  const [selectedGate, setSelectedGate] = useState<string | undefined>(undefined);

  const { data: enrolledCount = 0 } = useQuery({
    queryKey: ["personsCount"],
    queryFn: fetchPersonsCount,
    refetchInterval: 30_000,
  });

  const { data: gates = [] } = useQuery({
    queryKey: ["gates"],
    queryFn: fetchGates,
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["eventStats"],
    queryFn: fetchEventStats,
    refetchInterval: 15_000,
  });

  const {
    todayEvents,
    matchedEvents,
    recentCaptures,
    streamError,
    setStreamError,
    refetchEvents,
    clearCaptures,
  } = useDashboardEvents(selectedGate);

  const handleGateFocus = useCallback((id: string) => setSelectedGate(id), []);

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col overflow-hidden bg-gv-bg text-gray-100">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gv-border bg-[#090e1c] px-4 py-2 sm:gap-4 sm:px-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <IconDot online />
          <span>System Online</span>
        </div>
        <div className="ml-4 flex items-center gap-1.5 text-xs text-gray-400">
          <IconDot online />
          <span>AI Service</span>
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-xs text-gray-500">
          <LiveClock
            mode="datetime"
            options={{ weekday: "short", year: "numeric", month: "short", day: "numeric", hour12: false }}
            className="text-blue-300 text-sm font-bold"
          />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-gv-border-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="flex max-h-[38vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-1 lg:max-h-none xl:max-h-none">
          <PanelHeader icon={<IconChart />} title="System Overview" />
          <StatItem label="Today's Entries" value={stats?.todayEntries ?? 0} color="text-blue-400" icon={<IconCamera />} />
          <StatItem label="Pending Review" value={stats?.pendingReview ?? 0} color="text-amber-400" icon={<IconShield />} />
          <StatItem label="Total Enrolled" value={enrolledCount} color="text-emerald-400" icon={<IconUsers />} />
          <GateSelectorList gates={gates} selectedGate={selectedGate} onSelectGate={setSelectedGate} />
          <div className="border-t border-[#111f33] px-4 py-3 text-[10px] text-gray-700">
            Confidence thresholds: ≥80% Identified · &lt;80% Review
          </div>
        </aside>

        <main className="flex min-h-[280px] flex-col overflow-hidden bg-[#080d19] lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-2 xl:row-span-1">
          <FaceCapturesStrip
            recentCaptures={recentCaptures}
            todayCount={todayEvents.length}
            onClear={clearCaptures}
          />
          <div className="shrink-0 border-b border-gv-border">
            <PanelHeader icon={<IconCamera />} title="Live View" />
          </div>
          <div className="relative flex-1 overflow-hidden bg-black">
            {!selectedGate ? (
              <div
                className="h-full overflow-y-auto p-4"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2d4a transparent" }}
              >
                <p className="mb-3 text-[10px] uppercase tracking-widest text-gray-600">
                  {gates.length === 0 ? "No gates configured" : "Select a gate to focus its stream"}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {gates.map((gate) => (
                    <DashboardGateCard key={gate.id} gate={gate} onFocus={handleGateFocus} />
                  ))}
                </div>
              </div>
            ) : (
              <LiveStreamView
                gateId={selectedGate}
                streamError={streamError}
                onStreamError={() => setStreamError(true)}
                onClearError={() => setStreamError(false)}
                onBackToAll={() => setSelectedGate(undefined)}
              />
            )}
          </div>
        </main>

        <aside className="flex max-h-[40vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-2 lg:max-h-none xl:col-start-3 xl:row-start-1">
          <div className="flex items-center gap-2 border-b border-[#1e2d4a] bg-[#0a1020] px-4 py-2.5">
            <span className="text-blue-400">
              <IconTarget />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-300">Target Analysis</span>
            <button
              onClick={() => refetchEvents()}
              className="ml-2 rounded border border-blue-700/30 px-1.5 py-0.5 text-[10px] text-blue-400 transition-colors hover:bg-blue-950/50"
            >
              Refresh
            </button>
            <span className="ml-auto rounded border border-blue-500/30 bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
              {matchedEvents.length}
            </span>
          </div>
          <div
            className="flex-1 overflow-y-auto pt-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2d4a transparent" }}
          >
            {matchedEvents.length > 0 ? (
              matchedEvents.slice(0, 50).map((e) => <EventCard key={e.eventId} event={e} />)
            ) : enrolledCount === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <IconTarget />
                <p className="text-xs text-gray-600">No persons enrolled</p>
                <Link href="/persons" className="text-xs text-blue-400 underline hover:text-blue-300">
                  Add and enroll persons to see matched events
                </Link>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <IconTarget />
                <p className="text-xs text-gray-600">
                  {todayEvents.length > 0 ? "No known faces matched yet" : "Awaiting detections…"}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
