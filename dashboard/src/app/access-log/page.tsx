"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchValidatedEvents,
  fetchValidatedEventStats,
  deleteValidatedEvent,
  activityRangeBounds,
  type ValidatedEvent,
  type EventActivityRange,
} from "@/lib/api";
import { formatLocalDate, formatLocalTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const PERIOD_TABS: { value: EventActivityRange; label: string; hint: string }[] = [
  { value: "today", label: "Today", hint: "Local midnight → now" },
  { value: "week", label: "This week", hint: "Last 7 days" },
  { value: "month", label: "This month", hint: "Calendar month" },
];

const DIR_TABS = [
  { value: "", label: "All" },
  { value: "entry", label: "Entry" },
  { value: "exit", label: "Exit" },
];

const LIMIT = 50;

// ── Face thumbnail ────────────────────────────────────────────────────────────
function FaceThumbnail({ event }: { event: ValidatedEvent }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64 ? `data:image/jpeg;base64,${event.faceImageBase64}` : null;
  const ini = event.personName && event.personName !== "UNKNOWN"
    ? event.personName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{ width: 40, height: 40, background: "#0d1424", border: "2px solid #1e3a5f" }}
    >
      {src && !err ? (
        <img src={src} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-blue-400" style={{ fontFamily: "'Oxanium', monospace" }}>
          {ini}
        </span>
      )}
    </div>
  );
}

// ── Delete button ──────────────────────────────────────────────────────────────
function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <button
        onClick={onDelete}
        className="px-2.5 py-1 rounded text-[11px] font-semibold transition-all"
        style={{ background: "rgba(248,113,113,0.18)", color: "#f87171", border: "1px solid rgba(248,113,113,0.35)" }}
      >
        Confirm?
      </button>
    );
  }
  return (
    <button
      onClick={() => { setConfirming(true); setTimeout(() => setConfirming(false), 3000); }}
      className="px-2 py-1 rounded text-[11px] font-semibold transition-all opacity-0 group-hover:opacity-100"
      style={{ background: "transparent", color: "#64748b", border: "1px solid rgba(100,116,139,0.2)" }}
      title="Remove from access log"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Validated event row ────────────────────────────────────────────────────────
function ValidatedRow({
  event,
  onDelete,
}: {
  event: ValidatedEvent;
  onDelete: (id: string) => void;
}) {
  const isManual = event.validatedBy === "manual";
  const confPct = Math.round(event.confidence * 100);

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-white/[0.02]"
      style={{
        background: "rgba(10,16,32,0.6)",
        border: "1px solid #1a2640",
        borderLeft: `3px solid ${isManual ? "#818cf8" : "#22d3a5"}`,
      }}
    >
      <FaceThumbnail event={event} />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate" style={{ color: "#e2e8f0", fontFamily: "'Outfit', sans-serif" }}>
            {event.personName === "UNKNOWN" ? "Unidentified" : event.personName}
          </span>
          {event.department && (
            <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid #1e2d47" }}>
              {event.department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] font-mono" style={{ color: confPct >= 90 ? "#22d3a5" : "#64748b" }}>
            {confPct}% conf
          </span>
          <span className="text-[10px] capitalize text-gray-700">{event.direction}</span>
          {event.emotion && (
            <span className="text-[10px] text-gray-800">{event.emotion}</span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-mono text-gray-400">
          {formatLocalTime(event.timestamp)}
        </p>
        <p className="text-[10px] text-gray-700 mt-0.5">
          {formatLocalDate(event.timestamp)}
        </p>
      </div>

      {/* Source badge */}
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{
            color: isManual ? "#818cf8" : "#22d3a5",
            background: isManual ? "rgba(129,140,248,0.10)" : "rgba(34,211,165,0.08)",
            border: `1px solid ${isManual ? "rgba(129,140,248,0.25)" : "rgba(34,211,165,0.20)"}`,
            fontFamily: "'Oxanium', monospace",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: isManual ? "#818cf8" : "#22d3a5" }} />
          {isManual ? "Manual" : "Auto"}
        </span>
      </div>

      <DeleteBtn onDelete={() => onDelete(event.eventId)} />
    </div>
  );
}

// ── Stats strip ────────────────────────────────────────────────────────────────
const PERIOD_TOTAL_LABEL: Record<EventActivityRange, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
};

function StatsStrip({
  stats,
  period,
}: {
  stats?: { total: number; autoCount: number; manualCount: number; entries: number; exits: number } | null;
  period: EventActivityRange;
}) {
  if (!stats) return null;
  const cards = [
    { label: PERIOD_TOTAL_LABEL[period], value: stats.total, col: "#e2e8f0" },
    { label: "Auto (>85%)", value: stats.autoCount, col: "#22d3a5" },
    { label: "Manual", value: stats.manualCount, col: "#818cf8" },
    { label: "Entries", value: stats.entries, col: "#38bdf8" },
    { label: "Exits", value: stats.exits, col: "#f59e0b" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gv-border bg-gv-panel px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gv-muted">{c.label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: c.col, fontFamily: "'Oxanium', monospace" }}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AccessLogPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<EventActivityRange>("today");
  const [dirTab, setDirTab] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setName(nameInput), 300);
    return () => clearTimeout(id);
  }, [nameInput]);

  const bounds = useMemo(() => activityRangeBounds(period), [period]);

  const { data: stats } = useQuery({
    queryKey: ["validated-events-stats", period, bounds.from, bounds.to],
    queryFn: () => fetchValidatedEventStats(bounds.from, bounds.to),
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["validated-events", period, page, name, dirTab, bounds.from, bounds.to],
    queryFn: () =>
      fetchValidatedEvents(page, LIMIT, name || undefined, dirTab || undefined, bounds.from, bounds.to),
    refetchInterval: 30_000,
  });

  const handleDelete = useCallback(async (eventId: string) => {
    try {
      await deleteValidatedEvent(eventId);
      queryClient.setQueryData(
        ["validated-events", period, page, name, dirTab, bounds.from, bounds.to],
        (old: { items?: ValidatedEvent[]; total?: number } | undefined) => {
          if (!old?.items) return old;
          return { ...old, items: old.items.filter((i) => i.eventId !== eventId), total: Math.max(0, (old.total ?? 1) - 1) };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["validated-events-stats"] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["validated-events"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, period, page, name, dirTab, bounds.from, bounds.to]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const periodLabel = PERIOD_TABS.find((t) => t.value === period)?.label ?? period;

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
      <PageHeader
        title="Access Log"
        subtitle={
          data
            ? `${data.total} validated records · ${periodLabel}`
            : "High-confidence & operator-approved events"
        }
      />

      {/* Period tabs */}
      <div className="shrink-0 border-b border-gv-border bg-gv-panel-header px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
          {PERIOD_TABS.map((t) => {
            const active = period === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setPeriod(t.value); setPage(1); }}
                className={cn(
                  "rounded-lg border px-4 py-2 text-left transition-colors",
                  active ? "border-blue-600/40 bg-blue-700/25" : "border-transparent bg-transparent hover:bg-white/5",
                )}
              >
                <span className={cn("block text-xs font-semibold", active ? "text-blue-300" : "text-gray-400")}>
                  {t.label}
                </span>
                <span className="block text-[10px] text-gv-muted">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">

          <StatsStrip stats={stats} period={period} />

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: "#475569" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              Auto — confidence &gt; 85%, no operator needed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
              Manual — operator reviewed and approved from Events page
            </span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gv-border bg-gv-panel">
            <div className="flex flex-wrap items-center gap-3 border-b border-gv-border-subtle px-4 py-3">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
                Validated records
              </span>

              {/* Direction filter */}
              <div className="flex gap-0.5">
                {DIR_TABS.map((t) => {
                  const active = dirTab === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setDirTab(t.value); setPage(1); }}
                      className="rounded px-2.5 py-1 text-[11px] font-semibold transition-all"
                      style={{
                        color: active ? "#38bdf8" : "#475569",
                        background: active ? "rgba(56,189,248,0.12)" : "transparent",
                        border: active ? "1px solid rgba(56,189,248,0.28)" : "1px solid transparent",
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

            {/* Column headers */}
            <div
              className="grid px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gv-muted"
              style={{ gridTemplateColumns: "40px 1fr auto auto auto", gap: "1rem", alignItems: "center" }}
            >
              <span>Face</span>
              <span>Identity</span>
              <span className="hidden sm:block text-right">Time</span>
              <span>Source</span>
              <span />
            </div>

            <div className="space-y-1.5 px-4 pb-4">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[60px] w-full rounded-lg bg-gv-bg" />
                ))}

              {!isLoading && data?.items.map((event) => (
                <ValidatedRow key={event.eventId} event={event} onDelete={handleDelete} />
              ))}

              {!isLoading && data?.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 text-3xl">🛡️</div>
                  <p className="text-sm text-gv-muted">No validated records in this period</p>
                  <p className="mt-1 text-xs text-gv-muted/70">
                    Records appear here automatically when confidence &gt; 85%, or when you approve an event from the Events page.
                  </p>
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
                    className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted disabled:opacity-30 hover:text-gray-200"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 font-mono text-xs text-gv-muted">{page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted disabled:opacity-30 hover:text-gray-200"
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
  );
}
