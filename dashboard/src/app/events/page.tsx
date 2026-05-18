"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvents, createEventStream, updatePersonStatus, type GateEvent } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────
function statusColor(s?: string) {
  if (s === "Identified")  return "#22d3a5";
  if (s === "NeedsReview") return "#f59e0b";
  return "#f87171";
}

function statusLabel(s?: string) {
  if (s === "Identified")  return "Identified";
  if (s === "NeedsReview") return "Review";
  return "Unknown";
}

// ── Face + confidence ring ─────────────────────────────────────
function FaceRing({ event }: { event: GateEvent }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;

  const ini =
    event.personName && event.personName !== "UNKNOWN"
      ? event.personName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  const col  = statusColor(event.status);
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.max(0, Math.min(1, event.confidence));

  return (
    <div className="relative shrink-0" style={{ width: 58, height: 58 }}>
      <svg className="absolute inset-0" width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
        <circle
          cx="29" cy="29" r={r}
          fill="none"
          stroke={col}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          transform="rotate(-90 29 29)"
          style={{ filter: `drop-shadow(0 0 5px ${col}60)` }}
        />
      </svg>
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{ inset: 7, background: "#0a1020" }}
      >
        {src && !err ? (
          <img src={src} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold" style={{ color: col, fontFamily: "'Oxanium', monospace" }}>
            {ini}
          </span>
        )}
      </div>
      {/* Confidence dot tooltip */}
      <div
        className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold rounded-full flex items-center justify-center"
        style={{
          width: 18, height: 18,
          background: "#0a1020",
          border: `1.5px solid ${col}`,
          color: col,
          fontFamily: "monospace",
        }}
      >
        {Math.round(event.confidence * 100)}
      </div>
    </div>
  );
}

// ── Event card row ─────────────────────────────────────────────
function EventCard({
  event,
  onApprove,
  onBlock,
  approving,
  blocking,
}: {
  event: GateEvent;
  onApprove: (id: string) => void;
  onBlock: (id: string) => void;
  approving: boolean;
  blocking: boolean;
}) {
  const col        = statusColor(event.status);
  const canAct     = !!event.personId && (event.status === "NeedsReview" || event.status === "Unrecognized");
  const isReview   = event.status === "NeedsReview";
  const time       = new Date(event.timestamp);

  return (
    <div
      className="group relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.02]"
      style={{
        background: isReview ? "rgba(245,158,11,0.025)" : "rgba(10,16,32,0.6)",
        border: "1px solid",
        borderColor: isReview ? "rgba(245,158,11,0.18)" : "#1a2640",
        borderLeft: `3px solid ${col}`,
      }}
    >
      {/* Face ring */}
      <FaceRing event={event} />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: "#e2e8f0", fontFamily: "'Outfit', sans-serif" }}
          >
            {event.personName === "UNKNOWN" ? "Unidentified Person" : event.personName}
          </span>
          {event.department && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid #1e2d47" }}
            >
              {event.department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] font-mono font-medium" style={{ color: col }}>
            {Math.round(event.confidence * 100)}% confidence
          </span>
          <span className="text-[10px] text-gray-700 capitalize tracking-wide">{event.direction}</span>
          <span className="text-[10px] font-mono text-gray-800">{event.eventId.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-mono text-gray-400">
          {time.toLocaleTimeString("en-US", { hour12: false })}
        </p>
        <p className="text-[10px] text-gray-700 mt-0.5">
          {time.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{
            color: col,
            background: `${col}12`,
            border: `1px solid ${col}28`,
            fontFamily: "'Oxanium', monospace",
            letterSpacing: "0.02em",
          }}
        >
          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: col }} />
          {statusLabel(event.status)}
        </span>
      </div>

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onApprove(event.personId!)}
            disabled={approving || blocking}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(34,211,165,0.08)",
              color: "#22d3a5",
              border: "1px solid rgba(34,211,165,0.22)",
              fontFamily: "'Oxanium', monospace",
            }}
            title="Approve — set person Active"
          >
            {approving ? (
              <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            Accept
          </button>
          <button
            onClick={() => onBlock(event.personId!)}
            disabled={approving || blocking}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(248,113,113,0.08)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.22)",
              fontFamily: "'Oxanium', monospace",
            }}
            title="Block — revoke person access"
          >
            {blocking ? (
              <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
            Block
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tabs config ────────────────────────────────────────────────
const TABS = [
  { value: "",               label: "All",          col: "#64748b" },
  { value: "Identified",     label: "Identified",   col: "#22d3a5" },
  { value: "NeedsReview",    label: "Needs Review", col: "#f59e0b" },
  { value: "Unrecognized",   label: "Unknown",      col: "#f87171" },
];

// ── Page ───────────────────────────────────────────────────────
export default function EventsPage() {
  const queryClient  = useQueryClient();
  const [tab,        setTab]        = useState("");
  const [name,       setName]       = useState("");
  const [page,       setPage]       = useState(1);
  const [newAlerts,  setNewAlerts]  = useState(0);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutatingOp, setMutatingOp] = useState<"approve" | "block" | null>(null);
  const invalidateRef = useRef<ReturnType<typeof setTimeout>>();
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["events", page, name, tab],
    queryFn:  () => fetchEvents(page, limit, name || undefined, tab || undefined),
    refetchInterval: 30_000,
  });

  const { data: reviewCount } = useQuery({
    queryKey: ["events-count", "NeedsReview"],
    queryFn:  () => fetchEvents(1, 1, undefined, "NeedsReview"),
    refetchInterval: 15_000,
  });

  const { data: unknownCount } = useQuery({
    queryKey: ["events-count", "Unrecognized"],
    queryFn:  () => fetchEvents(1, 1, undefined, "Unrecognized"),
    refetchInterval: 15_000,
  });

  // Live stream — batch invalidates via debounce (2s window)
  useEffect(() => {
    const es = createEventStream((evt) => {
      if (evt.status === "NeedsReview" || evt.status === "Unrecognized") {
        setNewAlerts((n) => n + 1);
      }
      // Direct cache update for current page — avoids instant API refetch
      queryClient.setQueryData(["events", page, name, tab], (old: any) => {
        if (!old?.items) return old;
        const filtered = old.items.filter((i: any) => i.eventId !== evt.eventId);
        return { ...old, items: [evt, ...filtered].slice(0, limit), total: old.total + (filtered.length === old.items.length ? 1 : 0) };
      });
      // Debounced background refresh for consistency
      clearTimeout(invalidateRef.current);
      invalidateRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["events-count"] });
      }, 2000);
    });
    return () => { es.close(); clearTimeout(invalidateRef.current); };
  }, [queryClient, page, name, tab, limit]);

  const approveMutation = useMutation({
    mutationFn: (personId: string) => updatePersonStatus(personId, "Active"),
    onMutate:   (id) => { setMutatingId(id); setMutatingOp("approve"); },
    onSettled:  ()   => { setMutatingId(null); setMutatingOp(null); },
    onSuccess:  ()   => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const blockMutation = useMutation({
    mutationFn: (personId: string) => updatePersonStatus(personId, "Revoked"),
    onMutate:   (id) => { setMutatingId(id); setMutatingOp("block"); },
    onSettled:  ()   => { setMutatingId(null); setMutatingOp(null); },
    onSuccess:  ()   => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const tabCounts: Record<string, number | undefined> = {
    NeedsReview:  reviewCount?.total,
    Unrecognized: unknownCount?.total,
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&family=Outfit:wght@400;500;600&display=swap');
      `}</style>

      <div
        className="flex flex-col"
        style={{ minHeight: "calc(100vh - 44px)", background: "#060a15" }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="shrink-0 border-b px-6 py-4"
          style={{ background: "#07090f", borderColor: "#1a2640" }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1
                className="text-base font-semibold tracking-wide text-white"
                style={{ fontFamily: "'Oxanium', monospace" }}
              >
                Gate Events
              </h1>
              <p className="text-[11px] text-gray-600 mt-0.5 font-mono">
                {data ? `${data.total} records` : "—"}
              </p>
            </div>

            {newAlerts > 0 && (
              <button
                onClick={() => { setNewAlerts(0); setTab("NeedsReview"); setPage(1); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                  fontFamily: "'Oxanium', monospace",
                  animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {newAlerts} new alert{newAlerts > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs + search ──────────────────────────────────── */}
        <div
          className="shrink-0 border-b px-6 py-2.5"
          style={{ background: "#07090f", borderColor: "#1a2640" }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            {/* Tabs */}
            <div className="flex gap-0.5">
              {TABS.map((t) => {
                const active = tab === t.value;
                const count  = tabCounts[t.value];
                return (
                  <button
                    key={t.value}
                    onClick={() => { setTab(t.value); setPage(1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    style={{
                      fontFamily: "'Oxanium', monospace",
                      color:      active ? t.col : "#475569",
                      background: active ? `${t.col}12` : "transparent",
                      border:     active ? `1px solid ${t.col}30` : "1px solid transparent",
                    }}
                  >
                    {t.label}
                    {count != null && count > 0 && (
                      <span
                        className="inline-flex items-center justify-center rounded-full text-[9px] font-bold min-w-[16px] h-4 px-1"
                        style={{ background: `${t.col}20`, color: t.col }}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative ml-auto">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3"
                style={{ color: "#374151" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="Search name…"
                value={name}
                onChange={(e) => { setName(e.target.value); setPage(1); }}
                className="pl-7 pr-3 py-1.5 rounded text-xs"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #1a2640",
                  color: "#cbd5e1",
                  outline: "none",
                  width: 180,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Column headers ─────────────────────────────────── */}
        <div className="shrink-0 px-6 py-2" style={{ borderBottom: "1px solid #111827" }}>
          <div
            className="max-w-6xl mx-auto grid text-[10px] font-semibold uppercase tracking-widest"
            style={{
              color: "#374151",
              fontFamily: "'Oxanium', monospace",
              gridTemplateColumns: "58px 1fr auto auto auto",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <span>Face</span>
            <span>Identity</span>
            <span className="hidden sm:block text-right">Time</span>
            <span>Status</span>
            <span>Action</span>
          </div>
        </div>

        {/* ── List ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <div className="max-w-6xl mx-auto space-y-1.5">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[68px] rounded-lg"
                  style={{
                    background: "#0a1020",
                    border: "1px solid #1a2640",
                    opacity: 1 - i * 0.1,
                    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                  }}
                />
              ))}

            {!isLoading &&
              data?.items.map((event) => (
                <EventCard
                  key={event.eventId}
                  event={event}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onBlock={(id) => blockMutation.mutate(id)}
                  approving={mutatingId === event.personId && mutatingOp === "approve"}
                  blocking={mutatingId === event.personId && mutatingOp === "block"}
                />
              ))}

            {!isLoading && data?.items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <svg className="w-10 h-10" style={{ color: "#1e293b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-700">No events found</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Pagination ─────────────────────────────────────── */}
        {data && data.total > limit && (
          <div
            className="shrink-0 border-t px-6 py-3 flex items-center justify-between"
            style={{ background: "#07090f", borderColor: "#1a2640" }}
          >
            <p className="text-xs font-mono text-gray-700">
              {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)}{" "}
              <span className="text-gray-800">/ {data.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs rounded transition-colors disabled:opacity-25"
                style={{ background: "#0d1424", border: "1px solid #1a2640", color: "#6b7280" }}
              >
                ← Prev
              </button>
              <span className="text-xs font-mono px-2" style={{ color: "#374151" }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded transition-colors disabled:opacity-25"
                style={{ background: "#0d1424", border: "1px solid #1a2640", color: "#6b7280" }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
