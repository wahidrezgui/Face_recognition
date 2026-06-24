"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchEventActivity,
  fetchAdminGates,
  activityRangeBounds,
  deleteEvent,
  type GateEvent,
  type EventActivityRange,
} from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import { sortGateEventsByDetectionDesc } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { EventActivityStatsPanel } from "@/components/events/EventActivityStats";
import { EventActivityChart } from "@/components/events/EventActivityChart";
import { GateFilterCombobox } from "@/components/events/GateFilterCombobox";
import { PeriodTabs, PERIOD_TABS } from "@/components/events/PeriodTabs";

const EventDetailModal = dynamic(() => import("@/components/events/EventDetailModal"), { ssr: false });
const ReviewEventModal = dynamic(() => import("./ReviewEventModal"), { ssr: false });

const STATUS_TABS = [
  { value: "", label: "All", col: "#64748b" },
  { value: "Identified", label: "Identified", col: "#22d3a5" },
  { value: "NeedsReview", label: "Needs review", col: "#f59e0b" },
];

const LIMIT = 50;

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<EventActivityRange>("today");
  const [gateTab, setGateTab] = useState("");
  const [statusTab, setStatusTab] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setName(nameInput), 300);
    return () => clearTimeout(id);
  }, [nameInput]);

  const [selectedEvent, setSelectedEvent] = useState<GateEvent | null>(null);
  const [reviewEvent, setReviewEvent] = useState<GateEvent | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const bounds = useMemo(() => activityRangeBounds(period), [period]);

  const { data: gates = [] } = useQuery({
    queryKey: ["admin-gates"],
    queryFn: fetchAdminGates,
    staleTime: 60_000,
  });

  const gateOptions = useMemo(
    () => [...gates].sort((a, b) => a.name.localeCompare(b.name)),
    [gates],
  );

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["events-activity", period, bounds.from, bounds.to, gateTab],
    queryFn: () => fetchEventActivity(period, bounds.from, bounds.to, gateTab || undefined),
    refetchInterval: sseConnected ? false : 60_000,
  });

  const eventsQueryKey = ["events", period, page, name, statusTab, gateTab, bounds.from, bounds.to] as const;

  const { data, isLoading } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () =>
      fetchEvents(page, LIMIT, name || undefined, statusTab || undefined, bounds.from, bounds.to, gateTab || undefined),
    refetchInterval: sseConnected ? false : 60_000,
  });

  const sortedEvents = useMemo(
    () => sortGateEventsByDetectionDesc(data?.items ?? []),
    [data?.items],
  );

  useGateEventStream({
    gateId: gateTab || undefined,
    onOpen: () => setSseConnected(true),
    onError: () => setSseConnected(false),
    onEvent: (evt) => {
      if (statusTab && evt.status !== statusTab) return;
      if (gateTab && evt.gateId?.toLowerCase() !== gateTab) return;

      const ts = new Date(evt.timestamp).getTime();
      const fromMs = new Date(bounds.from).getTime();
      const toMs = new Date(bounds.to).getTime();
      if (ts < fromMs || ts >= toMs) return;

      queryClient.setQueryData(
        eventsQueryKey,
        (old: { items?: GateEvent[]; total?: number } | undefined) => {
          if (!old?.items) return old;
          const filtered = old.items.filter((i) => i.eventId !== evt.eventId);
          return {
            ...old,
            items: sortGateEventsByDetectionDesc([evt, ...filtered]).slice(0, LIMIT),
            total: old.total! + (filtered.length === old.items.length ? 1 : 0),
          };
        },
      );
      queryClient.setQueryData(
        ["events-activity", period, bounds.from, bounds.to, gateTab],
        (old: { total: number; identified: number; needsReview: number } | undefined) => {
          if (!old) return old;
          const isIdentified = evt.status === "Identified";
          return {
            ...old,
            total: old.total + 1,
            identified: old.identified + (isIdentified ? 1 : 0),
            needsReview: old.needsReview + (isIdentified ? 0 : 1),
          };
        },
      );
    },
  });

  const invalidateEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["events-activity"] });
    queryClient.invalidateQueries({ queryKey: ["validated-events"] });
  }, [queryClient]);

  const handleViewDetails = useCallback((event: GateEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleReview = useCallback((event: GateEvent) => {
    setReviewEvent(event);
  }, []);

  const handleDelete = useCallback(async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      // Optimistically remove from list
      queryClient.setQueryData(
        eventsQueryKey,
        (old: { items?: GateEvent[]; total?: number } | undefined) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.filter((i) => i.eventId !== eventId),
            total: Math.max(0, (old.total ?? 1) - 1),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["events-activity"] });
    } catch {
      // Silently refetch on error
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, period, page, name, statusTab, gateTab, bounds.from, bounds.to]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const periodLabel = PERIOD_TABS.find((p) => p.value === period)?.label ?? period;

  return (
    <>
      <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
        <PageHeader
          title="Gate events"
          subtitle={
            activity
              ? `${activity.total} events · ${periodLabel}`
              : "Activity and event log"
          }
        />

        {/* Period tabs */}
        <PeriodTabs
          period={period}
          onChange={(p) => {
            setPeriod(p);
            setPage(1);
          }}
        />

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-6xl space-y-5">
            <EventActivityStatsPanel stats={activity} isLoading={activityLoading} />
            <EventActivityChart stats={activity} range={period} isLoading={activityLoading} />

            {/* Event list */}
            <div className="rounded-xl border border-gv-border bg-gv-panel">
              <div className="flex flex-wrap items-center gap-3 border-b border-gv-border-subtle px-4 py-3">
                <span className="font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
                  Event log
                </span>
                <GateFilterCombobox
                  gates={gateOptions}
                  value={gateTab}
                  onChange={(id) => { setGateTab(id); setPage(1); }}
                />
                <div className="flex flex-wrap gap-0.5">
                  {STATUS_TABS.map((t) => {
                    const active = statusTab === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => { setStatusTab(t.value); setPage(1); }}
                        className="rounded px-2.5 py-1 text-[11px] font-semibold transition-all"
                        style={{
                          color: active ? t.col : "#475569",
                          background: active ? `${t.col}18` : "transparent",
                          border: active ? `1px solid ${t.col}35` : "1px solid transparent",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative ml-auto min-w-[160px] flex-1 sm:max-w-[200px]">
                  <Input
                    placeholder="Search name…"
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); setPage(1); }}
                    className="h-8 border-gv-border bg-gv-bg pl-8 text-xs"
                  />
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-gv-muted"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div
                className="grid px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gv-muted"
                style={{ gridTemplateColumns: "58px 1fr auto auto auto", gap: "1rem", alignItems: "center" }}
              >
                <span>Face</span>
                <span>Identity</span>
                <span className="hidden sm:block text-right">Time</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              <div className="space-y-1.5 px-4 pb-4">
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[68px] w-full rounded-lg bg-gv-bg" />
                  ))}

                {!isLoading &&
                  sortedEvents.map((event) => (
                    <EventCard
                      key={event.eventId}
                      event={event}
                      onViewDetails={handleViewDetails}
                      onReview={handleReview}
                      onDelete={handleDelete}
                    />
                  ))}

                {!isLoading && sortedEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-gv-muted">No events in this period</p>
                    <p className="mt-1 text-xs text-gv-muted/80">Try another tab or clear filters</p>
                  </div>
                )}
              </div>

              {data && data.total > LIMIT && (
                <div className="flex items-center justify-between border-t border-gv-border-subtle px-4 py-3">
                  <p className="font-mono text-xs text-gv-muted">
                    {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)}{" "}
                    <span className="text-gv-muted/60">/ {data.total}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted transition-colors disabled:opacity-30 hover:text-gray-200"
                    >
                      ← Prev
                    </button>
                    <span className="px-2 font-mono text-xs text-gv-muted">{page} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted transition-colors disabled:opacity-30 hover:text-gray-200"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {reviewEvent && (
        <ReviewEventModal
          event={reviewEvent}
          onClose={() => setReviewEvent(null)}
          onDone={() => { setReviewEvent(null); invalidateEvents(); }}
        />
      )}
    </>
  );
}
