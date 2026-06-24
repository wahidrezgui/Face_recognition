"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchValidatedEvents,
  fetchValidatedEventStats,
  fetchAdminGates,
  deleteValidatedEvent,
  activityRangeBounds,
  type ValidatedEvent,
  type EventActivityRange,
} from "@/lib/api";
import {
  fetchGateAutoValidateThresholds,
  resolveAutoValidateThreshold,
  shouldAutoValidate,
  gateEventToValidatedPreview,
} from "@/lib/gateRecognition";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GateFilterCombobox } from "@/components/events/GateFilterCombobox";
import { PeriodTabs, PERIOD_TABS } from "@/components/events/PeriodTabs";
import { AccessLogStatsCards } from "@/components/access-log/AccessLogStatsCards";
import { ValidatedRow } from "@/components/access-log/ValidatedRow";

const LIMIT = 50;

function sortValidatedBySaveOrder(items: ValidatedEvent[]): ValidatedEvent[] {
  return [...items].sort(
    (a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime(),
  );
}

export default function AccessLogPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<EventActivityRange>("today");
  const [gateTab, setGateTab] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setName(nameInput), 300);
    return () => clearTimeout(id);
  }, [nameInput]);

  const bounds = useMemo(() => activityRangeBounds(period), [period]);
  const isMilSearch = /^\d+$/.test(name);

  const { data: gates = [] } = useQuery({
    queryKey: ["admin-gates"],
    queryFn: fetchAdminGates,
    staleTime: 60_000,
  });

  const gateOptions = useMemo(
    () => [...gates].sort((a, b) => a.name.localeCompare(b.name)),
    [gates],
  );

  const validatedQueryKey = [
    "validated-events",
    period,
    page,
    name,
    gateTab,
    bounds.from,
    bounds.to,
  ] as const;

  const { data: gateThresholds } = useQuery({
    queryKey: ["gate-auto-validate-thresholds"],
    queryFn: fetchGateAutoValidateThresholds,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["validated-events-stats", period, bounds.from, bounds.to, gateTab],
    queryFn: () => fetchValidatedEventStats(bounds.from, bounds.to, gateTab || undefined),
    refetchInterval: sseConnected ? false : 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: validatedQueryKey,
    queryFn: () =>
      fetchValidatedEvents(page, LIMIT, name || undefined, bounds.from, bounds.to, gateTab || undefined),
    refetchInterval: sseConnected ? false : 60_000,
  });

  useGateEventStream({
    enabled: !!gateThresholds,
    gateId: gateTab || undefined,
    onOpen: () => setSseConnected(true),
    onError: () => setSseConnected(false),
    onEvent: (evt) => {
      if (!gateThresholds) return;
      if (gateTab && evt.gateId?.toLowerCase() !== gateTab) return;

      const threshold = resolveAutoValidateThreshold(
        evt.gateId,
        gateThresholds.thresholds,
        gateThresholds.gateIds,
      );
      if (!shouldAutoValidate(evt, threshold)) return;

      const ts = new Date(evt.timestamp).getTime();
      const fromMs = new Date(bounds.from).getTime();
      const toMs = new Date(bounds.to).getTime();
      if (ts < fromMs || ts >= toMs) return;
      if (name && !isMilSearch && !evt.personName.toLowerCase().includes(name.toLowerCase())) return;

      const preview = gateEventToValidatedPreview(evt);
      queryClient.setQueryData(
        validatedQueryKey,
        (old: { items?: ValidatedEvent[]; total?: number } | undefined) => {
          if (!old?.items) return old;
          const filtered = old.items.filter(
            (i) => i.gateEventId !== evt.eventId && i.eventId !== evt.eventId,
          );
          const isNew = filtered.length === old.items.length;
          return {
            ...old,
            items: sortValidatedBySaveOrder([preview, ...filtered]).slice(0, LIMIT),
            total: old.total! + (isNew ? 1 : 0),
          };
        },
      );
      queryClient.setQueryData(
        ["validated-events-stats", period, bounds.from, bounds.to, gateTab],
        (old: { total: number; autoCount: number; manualCount: number } | undefined) => {
          if (!old) return old;
          return { ...old, total: old.total + 1, autoCount: old.autoCount + 1 };
        },
      );
    },
  });

  const handleDelete = useCallback(
    async (eventId: string) => {
      try {
        await deleteValidatedEvent(eventId);
        queryClient.setQueryData(
          ["validated-events", period, page, name, gateTab, bounds.from, bounds.to],
          (old: { items?: ValidatedEvent[]; total?: number } | undefined) => {
            if (!old?.items) return old;
            return {
              ...old,
              items: old.items.filter((i) => i.eventId !== eventId),
              total: Math.max(0, (old.total ?? 1) - 1),
            };
          },
        );
        queryClient.invalidateQueries({ queryKey: ["validated-events-stats"] });
      } catch {
        queryClient.invalidateQueries({ queryKey: ["validated-events"] });
      }
    },
    [queryClient, period, page, name, gateTab, bounds.from, bounds.to],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const periodLabel = PERIOD_TABS.find((t) => t.value === period)?.label ?? period;

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
      <PageHeader
        title="Access Log"
        subtitle={
          data ? `${data.total} validated records · ${periodLabel}` : "High-confidence & operator-approved events"
        }
      />

      <PeriodTabs
        period={period}
        onChange={(p) => {
          setPeriod(p);
          setPage(1);
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <AccessLogStatsCards stats={stats} period={period} />

          <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: "#475569" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Auto — above the gate&apos;s auto-validate threshold, no operator needed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
              Manual — operator reviewed and approved from Events page
            </span>
          </div>

          <div className="rounded-xl border border-gv-border bg-gv-panel">
            <div className="flex flex-wrap items-center gap-3 border-b border-gv-border-subtle px-4 py-3">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
                Validated records
              </span>
              <GateFilterCombobox
                gates={gateOptions}
                value={gateTab}
                onChange={(id) => {
                  setGateTab(id);
                  setPage(1);
                }}
              />
              <div className="relative ml-auto min-w-[160px] flex-1 sm:max-w-[200px]">
                <Input
                  placeholder="Search name or mil #…"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 border-gv-border bg-gv-bg pl-8 text-xs"
                />
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-gv-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div
              className="grid px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gv-muted"
              style={{ gridTemplateColumns: "40px 1fr auto auto auto", gap: "1rem", alignItems: "center" }}
            >
              <span>Face</span>
              <span>Identity</span>
              <span className="hidden text-right sm:block">Time</span>
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
                    Records appear here when a gate auto-validates an event (per gate threshold), or when you approve
                    one from the Events page.
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
                    className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted hover:text-gray-200 disabled:opacity-30"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 font-mono text-xs text-gv-muted">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gv-border bg-gv-bg px-3 py-1 text-xs text-gv-muted hover:text-gray-200 disabled:opacity-30"
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
