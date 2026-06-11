"use client";

import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { LiveClock } from "@/components/LiveClock";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchPersons,
  fetchPersonsCount,
  fetchEventStats,
  fetchGates,
  gateStreamUrl,
  type GateEvent,
  type GateStatus,
} from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import Link from "next/link";
import { IconCamera, IconFace, IconTarget, IconChart, IconShield, IconUsers, IconDot } from "@/components/icons";
import { PanelHeader, StatItem, CaptureThumb, EventCard } from "@/components/face-display";

// ── Compact gate card shown in the "no gate selected" overview ──────────────
const DashboardGateCard = memo(function DashboardGateCard({ gate, onFocus }: { gate: GateStatus; onFocus: (id: string) => void }) {
  const [streamErr, setStreamErr] = useState(false);
  const isLive = gate.online && (gate.status?.camera_open ?? false);
  return (
    <div className="rounded border border-[#1a2640] bg-[#0d1a2f] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <IconDot online={isLive} />
        <span className="text-xs font-medium text-gray-200 truncate">{gate.name}</span>
        <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${isLive ? "text-emerald-400 border-emerald-800 bg-emerald-950" : "text-red-400 border-red-900 bg-red-950"}`}>
          {isLive ? "LIVE" : "OFF"}
        </span>
      </div>

      {isLive && !streamErr && (
        <div className="aspect-video overflow-hidden rounded bg-black">
          <img
            src={gateStreamUrl(gate.id)}
            alt={gate.name}
            className="w-full h-full object-contain"
            onError={() => setStreamErr(true)}
          />
        </div>
      )}

      {gate.online && gate.status && (
        <div className="grid grid-cols-2 gap-x-3 text-[10px]">
          <span className="text-gray-600">Direction</span>
          <span className="capitalize text-gray-400">{gate.status.direction}</span>
          <span className="text-gray-600">FPS</span>
          <span className="text-gray-400">{gate.status.processing_fps}</span>
          {gate.status.stats && (
            <>
              <span className="text-gray-600">Faces today</span>
              <span className="text-gray-400">{gate.status.stats.faces_detected.toLocaleString()}</span>
            </>
          )}
        </div>
      )}

      {!gate.online && (
        <p className="text-[10px] text-gray-600">Gate AI service unreachable</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onFocus(gate.id)}
          disabled={!isLive}
          className="flex-1 py-1 text-[10px] rounded border border-blue-600/30 text-blue-400 hover:bg-blue-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Focus Stream
        </button>
        <Link
          href={`/config?gateId=${gate.id}`}
          className="py-1 px-2 text-[10px] rounded border border-[#1a2640] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Config
        </Link>
      </div>
    </div>
  );
});

// ── page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [liveEvents, setLiveEvents] = useState<GateEvent[]>([]);
  const [streamError, setStreamError] = useState(false);
  const [selectedGate, setSelectedGate] = useState<string | undefined>(undefined);

  const { data: initialData, refetch: refetchEvents } = useQuery({
    queryKey: ["events", 1],
    queryFn: () => fetchEvents(1, 30),
  });

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

  const onlineGates = useMemo(() => gates.filter((g) => g.online && g.status?.camera_open), [gates]);

  // Reset stream error whenever the selected gate changes
  useEffect(() => {
    setStreamError(false);
  }, [selectedGate]);

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
    staleTime: 5 * 60 * 1000,
  });

  const employeeIds = useMemo(() => new Set(persons.map((p) => p.id)), [persons]);

  const matchedEvents = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return liveEvents.filter(
      (e) => e.personId && employeeIds.has(e.personId) && new Date(e.timestamp) >= todayStart,
    );
  }, [liveEvents, employeeIds]);

  const { data: stats } = useQuery({
    queryKey: ["eventStats"],
    queryFn: fetchEventStats,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (initialData?.items) setLiveEvents(initialData.items);
  }, [initialData]);

  const handleStreamEvent = useCallback((e: GateEvent) => {
    setLiveEvents((prev) => {
      const exactIdx = prev.findIndex((p) => p.eventId === e.eventId);
      if (exactIdx !== -1) {
        const updated = [...prev];
        updated[exactIdx] = e;
        return updated;
      }
      if (e.personId) {
        const newTime = new Date(e.timestamp).getTime();
        const dupIdx = prev.findIndex(
          (p) => p.personId === e.personId && (newTime - new Date(p.timestamp).getTime()) <= 5000,
        );
        if (dupIdx !== -1) {
          if (e.confidence > prev[dupIdx].confidence) {
            const updated = [...prev];
            updated[dupIdx] = e;
            return updated;
          }
          return prev;
        }
      }
      return [e, ...prev].slice(0, 100);
    });
  }, []);

  useGateEventStream({
    gateId: selectedGate,
    onEvent: handleStreamEvent,
    onOpen: () => setStreamError(false),
    onError: () => setStreamError(true),
  });

  const handleGateFocus = useCallback((id: string) => setSelectedGate(id), []);

  const handleClearCaptures = useCallback(() => {
    setLiveEvents([]);
  }, []);

  const handleRefreshAnalysis = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  const recentCaptures = liveEvents.slice(0, 6);

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col overflow-hidden bg-gv-bg text-gray-100">
      {/* ── Header bar ─────────────────────────────────────── */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gv-border bg-[#090e1c] px-4 py-2 sm:gap-4 sm:px-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <IconDot online />
          <span>System Online</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-4">
          <IconDot online />
          <span>AI Service</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-4">
          <span className="text-gray-600">{selectedGate ? gates.find(g => g.id === selectedGate)?.name ?? selectedGate : "All Gates"}</span>
          <IconDot online={!streamError} />
          <span>{streamError ? "Offline" : "Live"}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 font-mono">
          <LiveClock mode="date" options={{ weekday: "short", year: "numeric", month: "short", day: "numeric" }} />
          <LiveClock mode="time" options={{ hour12: false }} className="text-blue-300 text-sm font-bold" />
        </div>
      </header>

      {/* ── Main grid: stack on mobile, 3-col on xl ──────── */}
      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-gv-border-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* ── LEFT: Stats & system panel ─────────────────── */}
        <aside className="flex max-h-[38vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-1 lg:max-h-none xl:max-h-none">
          <PanelHeader icon={<IconChart />} title="System Overview" />

          <StatItem label="Today's Entries" value={stats?.todayEntries ?? 0} color="text-blue-400" icon={<IconCamera />} />
          <StatItem label="Pending Review" value={stats?.pendingReview ?? 0} color="text-amber-400" icon={<IconShield />} />
          <StatItem label="Total Enrolled" value={enrolledCount} color="text-emerald-400" icon={<IconUsers />} />

          {/* Camera / Gate list */}
          <div className="mt-auto">
            <PanelHeader icon={<IconCamera />} title="Gates" />
            {gates.length === 0 && (
              <div className="px-4 py-2.5 text-[10px] text-gray-500">
                No gates detected yet
              </div>
            )}
            {gates.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGate(selectedGate === g.id ? undefined : g.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-[#111f33] hover:bg-[#0d1a2f] cursor-pointer ${selectedGate === g.id ? "bg-[#0d1a2f]" : ""}`}
              >
                <IconDot online={g.online && (g.status?.camera_open ?? false)} />
                <div>
                  <p className="text-xs font-medium text-gray-200">{g.name}</p>
                  <p className="text-[10px] text-gray-600">
                    {selectedGate === g.id ? "Selected" : "Click to filter"}
                  </p>
                </div>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${g.online && g.status?.camera_open ? "text-emerald-400 border-emerald-800 bg-emerald-950" : "text-red-400 border-red-900 bg-red-950"}`}>
                  {g.online && g.status?.camera_open ? "LIVE" : "OFF"}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 text-[10px] text-gray-700 border-t border-[#111f33]">
            Confidence thresholds: ≥80% Identified · &lt;80% Review
          </div>
        </aside>

        {/* ── CENTER: Face captures + camera feed ────────── */}
        <main className="flex min-h-[280px] flex-col overflow-hidden bg-[#080d19] lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-2 xl:row-span-1">
          {/* Face captures strip */}
          <div className="shrink-0 border-b border-gv-border">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#0a1020]">
              <span className="text-blue-400"><IconFace /></span>
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-300">Face Captures</span>
              {liveEvents.length > 0 && (
                <button
                  onClick={handleClearCaptures}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-red-800/30 text-red-400 hover:bg-red-950/50 transition-colors"
                >
                  Clear
                </button>
              )}
              <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5">
                {liveEvents.length}
              </span>
            </div>
            <div className="flex gap-3 px-4 py-2.5 overflow-x-auto">
              {recentCaptures.length > 0 ? (
                recentCaptures.map((e) => <CaptureThumb key={e.eventId} event={e} />)
              ) : (
                <p className="text-xs text-gray-600 py-2">No detections yet. Ensure the AI service is running and camera feed is active.</p>
              )}
            </div>
          </div>

          {/* Live camera feed */}
          <div className="shrink-0 border-b border-gv-border">
            <PanelHeader icon={<IconCamera />} title="Live View" />
          </div>

          <div className="relative flex-1 overflow-hidden bg-black">
            {!selectedGate ? (
              /* ── No gate selected: overview cards ── */
              <div className="h-full overflow-y-auto p-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2d4a transparent" }}>
                <p className="mb-3 text-[10px] uppercase tracking-widest text-gray-600">
                  {gates.length === 0 ? "No gates configured" : "Select a gate to focus its stream"}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {gates.map((gate) => (
                    <DashboardGateCard
                      key={gate.id}
                      gate={gate}
                      onFocus={handleGateFocus}
                    />
                  ))}
                </div>
              </div>
            ) : !streamError ? (
              /* ── Gate selected: live stream ── */
              <>
                <img
                  src={gateStreamUrl(selectedGate)}
                  alt="Live camera feed"
                  className="w-full h-full object-contain"
                  onError={() => setStreamError(true)}
                />
                <div className="absolute top-3 left-3 font-mono text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
                  <LiveClock mode="date" options={{ year: "numeric", month: "2-digit", day: "2-digit" }} transform={(s) => s.replace(/\//g, "-")} />
                  &nbsp;<LiveClock mode="time" options={{ hour12: false }} />
                </div>
                {[
                  "top-2 left-2 border-t border-l",
                  "top-2 right-2 border-t border-r",
                  "bottom-2 left-2 border-b border-l",
                  "bottom-2 right-2 border-b border-r",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-4 h-4 border-blue-400/60 ${cls}`} />
                ))}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 rounded px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-white/80 tracking-wider">LIVE</span>
                </div>
                <button
                  onClick={() => setSelectedGate(undefined)}
                  className="absolute top-3 right-3 text-[10px] px-2 py-1 bg-black/60 hover:bg-black/80 rounded border border-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  ← All Gates
                </button>
              </>
            ) : (
              /* ── Stream error ── */
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909" />
                </svg>
                <p className="text-sm text-gray-600">Stream unavailable</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStreamError(false)}
                    className="text-xs px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/50 border border-blue-600/30 rounded transition-colors text-blue-300"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setSelectedGate(undefined)}
                    className="text-xs px-3 py-1.5 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded transition-colors text-gray-400"
                  >
                    All Gates
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT: Target Analysis (matched events) ────── */}
        <aside className="flex max-h-[40vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-2 lg:max-h-none xl:col-start-3 xl:row-start-1">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#0a1020]">
            <span className="text-blue-400"><IconTarget /></span>
            <span className="text-xs font-semibold tracking-widest uppercase text-gray-300">Target Analysis</span>
            <button
              onClick={handleRefreshAnalysis}
              className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-blue-700/30 text-blue-400 hover:bg-blue-950/50 transition-colors"
            >
              Refresh
            </button>
            <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5">
              {matchedEvents.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2d4a transparent" }}>
            {matchedEvents.length > 0 ? (
              matchedEvents.slice(0, 50).map((e) => <EventCard key={e.eventId} event={e} />)
            ) : enrolledCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                <IconTarget />
                <p className="text-xs text-gray-600">No persons enrolled</p>
                <Link href="/persons" className="text-xs text-blue-400 hover:text-blue-300 underline">
                  Add and enroll persons to see matched events
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <IconTarget />
                <p className="text-xs text-gray-600">{liveEvents.length > 0 ? "No known faces matched yet" : "Awaiting detections…"}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
