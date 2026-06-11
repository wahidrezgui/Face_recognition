"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTrainingEvents, deleteEvent, type GateEvent } from "@/lib/api";
import { toast } from "sonner";
import ReviewEventModal from "./ReviewEventModal";
import EditTrainingEventModal from "./EditTrainingEventModal";

import { EventCard } from "@/components/events/EventCard";
import EventDetailModal from "@/components/events/EventDetailModal";

const TABS = [
  { value: "", label: "All", col: "#64748b" },
  { value: "NeedsReview", label: "Needs Review", col: "#f59e0b" },
  { value: "Identified", label: "Identified", col: "#22d3a5" },
];

export default function TrainingEventsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setName(nameInput), 300);
    return () => clearTimeout(id);
  }, [nameInput]);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutatingOp, setMutatingOp] = useState<"delete" | null>(null);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["training-events", page, name, tab],
    queryFn: () => fetchTrainingEvents(page, limit, name || undefined, tab || undefined),
    refetchInterval: 15_000,
  });

  const { data: reviewCount } = useQuery({
    queryKey: ["training-events-count", "NeedsReview"],
    queryFn: () => fetchTrainingEvents(1, 1, undefined, "NeedsReview"),
    refetchInterval: 15_000,
  });

  const [selectedEvent, setSelectedEvent] = useState<GateEvent | null>(null);
  const [reviewEvent, setReviewEvent] = useState<GateEvent | null>(null);
  const [editEvent, setEditEvent] = useState<GateEvent | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onMutate: (id) => { setMutatingId(id); setMutatingOp("delete"); },
    onSettled: () => { setMutatingId(null); setMutatingOp(null); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-events"] });
      toast.success("Event removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove event"),
  });

  const tabCounts: Record<string, number | undefined> = {
    NeedsReview: reviewCount?.total,
  };

  const handleViewDetails = useCallback((event: GateEvent) => {
    setSelectedEvent(event);
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <>
      <div
        className="flex flex-col"
        style={{ minHeight: "calc(100vh - 44px)", background: "#060a15" }}
      >
        <div
          className="shrink-0 border-b px-6 py-4"
          style={{ background: "#07090f", borderColor: "#1a2640" }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold tracking-wide text-white" style={{ fontFamily: "'Oxanium', monospace" }}>
                Training Events
              </h1>
              <p className="text-[11px] text-gray-600 mt-0.5 font-mono">
                {data ? `${data.total} records` : "—"} · Review and link unknown detections
              </p>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-b px-6 py-2.5"
          style={{ background: "#07090f", borderColor: "#1a2640" }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
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
            <div className="relative ml-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "#374151" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="Search name..."
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setPage(1); }}
                className="pl-7 pr-3 py-1.5 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2640", color: "#cbd5e1", outline: "none", width: 180 }}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 px-6 py-2" style={{ borderBottom: "1px solid #111827" }}>
          <div
            className="max-w-6xl mx-auto grid text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#374151", fontFamily: "'Oxanium', monospace", gridTemplateColumns: "58px 1fr auto auto auto", gap: "1rem", alignItems: "center" }}
          >
            <span>Face</span><span>Identity</span>
            <span className="hidden sm:block text-right">Time</span><span>Status</span><span>Action</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          <div className="max-w-6xl mx-auto space-y-1.5">
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-lg" style={{ background: "#0a1020", border: "1px solid #1a2640", opacity: 1 - i * 0.1, animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
            ))}
            {!isLoading && data?.items.map((event) => (
              <div key={event.eventId} className="group relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.02]"
                style={{
                  background: event.status === "NeedsReview" ? "rgba(245,158,11,0.025)" : "rgba(10,16,32,0.6)",
                  border: "1px solid",
                  borderColor: event.status === "NeedsReview" ? "rgba(245,158,11,0.18)" : "#1a2640",
                }}
              >
                <EventCard event={event} onViewDetails={handleViewDetails} />
                <div className="flex gap-1.5 shrink-0">
                  {event.status === "NeedsReview" && (
                    <button
                      onClick={() => setReviewEvent(event)}
                      disabled={mutatingId === event.eventId && mutatingOp === "delete"}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
                      style={{
                        background: "rgba(34,211,165,0.08)",
                        color: "#22d3a5",
                        border: "1px solid rgba(34,211,165,0.22)",
                        fontFamily: "'Oxanium', monospace",
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Review
                    </button>
                  )}
                  <button
                    onClick={() => setEditEvent(event)}
                    disabled={mutatingId === event.eventId}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.22)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(event.eventId)}
                    disabled={mutatingId === event.eventId}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      color: "#f87171",
                      border: "1px solid rgba(248,113,113,0.22)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    {mutatingId === event.eventId && mutatingOp === "delete" ? (
                      <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <svg className="w-10 h-10" style={{ color: "#1e293b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-700">No training events found</p>
              </div>
            )}
          </div>
        </div>

        {data && data.total > limit && (
          <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between" style={{ background: "#07090f", borderColor: "#1a2640" }}>
            <p className="text-xs font-mono text-gray-700">
              {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} <span className="text-gray-800">/ {data.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-xs rounded transition-colors disabled:opacity-25"
                style={{ background: "#0d1424", border: "1px solid #1a2640", color: "#6b7280" }}>
                &larr; Prev
              </button>
              <span className="text-xs font-mono px-2" style={{ color: "#374151" }}>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded transition-colors disabled:opacity-25"
                style={{ background: "#0d1424", border: "1px solid #1a2640", color: "#6b7280" }}>
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {reviewEvent && (
        <ReviewEventModal
          event={reviewEvent}
          onClose={() => setReviewEvent(null)}
          onDone={() => setReviewEvent(null)}
        />
      )}
      {editEvent && (
        <EditTrainingEventModal
          event={editEvent}
          onClose={() => setEditEvent(null)}
          onDone={() => setEditEvent(null)}
        />
      )}
    </>
  );
}
