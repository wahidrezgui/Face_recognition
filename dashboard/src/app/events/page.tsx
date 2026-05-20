"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvents, deleteEvent, type GateEvent } from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import { toast } from "sonner";
import ReviewEventModal from "./ReviewEventModal";

import { EventCard } from "@/components/events/EventCard";

// ── Tabs config ──────────────────────────────────────────────── ────────────────────────────────────────────────
const TABS = [
  { value: "", label: "All", col: "#64748b" },
  { value: "Identified", label: "Identified", col: "#22d3a5" },
  { value: "NeedsReview", label: "Needs Review", col: "#f59e0b" },
];

// ── Page ───────────────────────────────────────────────────────
export default function EventsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [newAlerts, setNewAlerts] = useState(0);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutatingOp, setMutatingOp] = useState<"block" | null>(null);
  const invalidateRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["events", page, name, tab],
    queryFn: () => fetchEvents(page, limit, name || undefined, tab || undefined),
    refetchInterval: 30_000,
  });

  const { data: reviewCount } = useQuery({
    queryKey: ["events-count", "NeedsReview"],
    queryFn: () => fetchEvents(1, 1, undefined, "NeedsReview"),
    refetchInterval: 15_000,
  });

  useGateEventStream({
    onEvent: (evt) => {
      if (evt.status === "NeedsReview") {
        setNewAlerts((n) => n + 1);
      }
      queryClient.setQueryData(["events", page, name, tab], (old: { items?: GateEvent[]; total?: number } | undefined) => {
        if (!old?.items) return old;
        const filtered = old.items.filter((i) => i.eventId !== evt.eventId);
        return {
          ...old,
          items: [evt, ...filtered].slice(0, limit),
          total: old.total! + (filtered.length === old.items.length ? 1 : 0),
        };
      });
      clearTimeout(invalidateRef.current);
      invalidateRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["events-count"] });
      }, 2000);
    },
  });

  useEffect(() => () => clearTimeout(invalidateRef.current), []);

  const [reviewEvent, setReviewEvent] = useState<GateEvent | null>(null);

  const blockMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onMutate: (id) => { setMutatingId(id); setMutatingOp("block"); },
    onSettled: () => { setMutatingId(null); setMutatingOp(null); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove event"),
  });

  const tabCounts: Record<string, number | undefined> = {
    NeedsReview: reviewCount?.total,
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <>
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
                const count = tabCounts[t.value];
                return (
                  <button
                    key={t.value}
                    onClick={() => { setTab(t.value); setPage(1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    style={{
                      fontFamily: "'Oxanium', monospace",
                      color: active ? t.col : "#475569",
                      background: active ? `${t.col}12` : "transparent",
                      border: active ? `1px solid ${t.col}30` : "1px solid transparent",
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
                  onApprove={() => setReviewEvent(event)}
                  onBlock={() => blockMutation.mutate(event.eventId)}
                  blocking={mutatingId === event.eventId && mutatingOp === "block"}
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

      {reviewEvent && (
        <ReviewEventModal
          event={reviewEvent}
          onClose={() => setReviewEvent(null)}
          onDone={() => setReviewEvent(null)}
        />
      )}
    </>
  );
}
