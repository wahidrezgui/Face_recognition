"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchPersons,
  fetchPersonsCount,
  fetchEventStats,
  createEventStream,
  type GateEvent,
} from "@/lib/api";
import Link from "next/link";
import { IconCamera, IconFace, IconTarget, IconChart, IconShield, IconUsers, IconDot } from "@/components/icons";
import { PanelHeader, StatItem, CaptureThumb, EventCard } from "@/components/face-display";

// ── page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [liveEvents, setLiveEvents] = useState<GateEvent[]>([]);
  const [streamError, setStreamError] = useState(false);
  const [now, setNow] = useState(new Date());

  const { data: initialData } = useQuery({
    queryKey: ["events", 1],
    queryFn: () => fetchEvents(1, 30),
  });

  const { data: enrolledCount = 0 } = useQuery({
    queryKey: ["personsCount"],
    queryFn: fetchPersonsCount,
    refetchInterval: 30_000,
  });

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
    staleTime: 5 * 60 * 1000,
  });

  const employeeIds = useMemo(() => new Set(persons.map((p) => p.id)), [persons]);

  const matchedEvents = useMemo(
    () => liveEvents.filter((e) => e.personId && employeeIds.has(e.personId)),
    [liveEvents, employeeIds],
  );

  const { data: stats } = useQuery({
    queryKey: ["eventStats"],
    queryFn: fetchEventStats,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (initialData?.items) setLiveEvents(initialData.items);
  }, [initialData]);

  useEffect(() => {
    const es = createEventStream(
      (e) => { setLiveEvents((prev) => [e, ...prev].slice(0, 100)); },
      () => { setStreamError(true); },
      () => { setStreamError(false); }
    );
    return () => es.close();
  }, []);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const recentCaptures = liveEvents.slice(0, 6);

  return (
    <div
      className="flex flex-col overflow-hidden text-gray-100"
      style={{ height: "calc(100vh - 44px)", background: "#07090f" }}
    >
      {/* ── Header bar ─────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center gap-4 px-5 py-2 border-b"
        style={{ background: "#090e1c", borderColor: "#1a2640" }}
      >
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <IconDot online />
          <span>System Online</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-4">
          <IconDot online />
          <span>AI Service</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-4">
          <span className="text-gray-600">Camera 01</span>
          <IconDot online={!streamError} />
          <span>{streamError ? "Offline" : "Live"}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 font-mono">
          <span suppressHydrationWarning>{now.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
          <span className="text-blue-300 text-sm font-bold" suppressHydrationWarning>
            {now.toLocaleTimeString("en-US", { hour12: false })}
          </span>
        </div>
      </header>

      {/* ── Main 3-column grid ─────────────────────────────── */}
      <div
        className="flex-1 grid overflow-hidden"
        style={{ gridTemplateColumns: "240px 1fr 300px", gap: "1px", background: "#111927" }}
      >
        {/* ── LEFT: Stats & system panel ─────────────────── */}
        <aside className="flex flex-col overflow-hidden" style={{ background: "#080e1b" }}>
          <PanelHeader icon={<IconChart />} title="System Overview" />

          <StatItem label="Today's Entries"  value={stats?.todayEntries ?? 0} color="text-blue-400"    icon={<IconCamera />} />
          <StatItem label="Pending Review"   value={stats?.pendingReview ?? 0} color="text-amber-400"  icon={<IconShield />} />
          <StatItem label="Unrecognized"     value={stats?.unknowns ?? 0}      color="text-red-400"    icon={<IconFace />} />
          <StatItem label="Total Enrolled"   value={enrolledCount}             color="text-emerald-400" icon={<IconUsers />} />

          {/* Camera list */}
          <div className="mt-auto">
            <PanelHeader icon={<IconCamera />} title="Cameras" />
            {[
              { name: "Camera 01", zone: "Main Entrance", online: !streamError },
            ].map((cam) => (
              <div
                key={cam.name}
                className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#111f33] hover:bg-[#0d1a2f] cursor-pointer"
              >
                <IconDot online={cam.online} />
                <div>
                  <p className="text-xs font-medium text-gray-200">{cam.name}</p>
                  <p className="text-[10px] text-gray-600">{cam.zone}</p>
                </div>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${cam.online ? "text-emerald-400 border-emerald-800 bg-emerald-950" : "text-red-400 border-red-900 bg-red-950"}`}>
                  {cam.online ? "LIVE" : "OFF"}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 text-[10px] text-gray-700 border-t border-[#111f33]">
            Confidence thresholds: ≥85% Identified · 65–84% Review · &lt;65% Unknown
          </div>
        </aside>

        {/* ── CENTER: Face captures + camera feed ────────── */}
        <main className="flex flex-col overflow-hidden" style={{ background: "#080d19" }}>
          {/* Face captures strip */}
          <div className="shrink-0 border-b" style={{ borderColor: "#1a2640" }}>
            <PanelHeader icon={<IconFace />} title="Face Captures" count={liveEvents.length} />
            <div className="flex gap-3 px-4 py-2.5 overflow-x-auto">
              {recentCaptures.length > 0 ? (
                recentCaptures.map((e) => <CaptureThumb key={e.eventId} event={e} />)
              ) : (
                <p className="text-xs text-gray-600 py-2">No detections yet. Ensure the AI service is running and camera feed is active.</p>
              )}
            </div>
          </div>

          {/* Live camera feed */}
          <div className="shrink-0 border-b" style={{ borderColor: "#1a2640" }}>
            <PanelHeader icon={<IconCamera />} title="Live View" />
          </div>

          <div className="relative flex-1 overflow-hidden bg-black">
            {!streamError ? (
              <>
                <img
                  src="/stream"
                  alt="Live camera feed"
                  className="w-full h-full object-contain"
                  onError={() => setStreamError(true)}
                />
                {/* Timestamp overlay */}
                <div className="absolute top-3 left-3 font-mono text-xs text-white/70 bg-black/50 px-2 py-1 rounded" suppressHydrationWarning>
                  {now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-")}
                  &nbsp;{now.toLocaleTimeString("en-US", { hour12: false })}
                </div>
                {/* Corner brackets */}
                {[
                  "top-2 left-2 border-t border-l",
                  "top-2 right-2 border-t border-r",
                  "bottom-2 left-2 border-b border-l",
                  "bottom-2 right-2 border-b border-r",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-4 h-4 border-blue-400/60 ${cls}`} />
                ))}
                {/* Live badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 rounded px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-white/80 tracking-wider">LIVE</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909" />
                </svg>
                <p className="text-sm text-gray-600">Stream unavailable</p>
                <button
                  onClick={() => setStreamError(false)}
                  className="text-xs px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/50 border border-blue-600/30 rounded transition-colors text-blue-300"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT: Target Analysis (matched events) ────── */}
        <aside
          className="flex flex-col overflow-hidden"
          style={{ background: "#080e1b" }}
        >
          <PanelHeader icon={<IconTarget />} title="Target Analysis" count={matchedEvents.length} />

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
