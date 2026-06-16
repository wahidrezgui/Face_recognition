"use client";

import type { EventActivityStats, EventActivityRange } from "@/lib/api";
import { localTimezoneLabel } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function formatDayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function EventActivityChart({
  stats,
  range,
  isLoading,
}: {
  stats?: EventActivityStats;
  range: EventActivityRange;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl bg-gv-panel" />;
  }

  if (!stats) return null;

  const isToday = range === "today" && stats.byHour && stats.byHour.length > 0;
  const buckets = isToday
    ? stats.byHour!.map((h) => ({
      label: `${h.hour.toString().padStart(2, "0")}:00`,
      total: h.total,
      identified: 0,
    }))
    : stats.byDay.map((d) => ({
      label: range === "week" ? formatDayLabel(d.date).split(",")[0] : d.date.slice(5),
      total: d.total,
      identified: d.identified,
    }));

  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <div className="rounded-xl border border-gv-border bg-gv-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
          {isToday ? `Activity by hour (${localTimezoneLabel()})` : "Activity by day"}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gv-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-500/80" />
            Total
          </span>
          {!isToday && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/80" />
              Identified
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-end gap-1 sm:gap-1.5",
          isToday ? "h-32" : "h-36",
        )}
      >
        {buckets.map((b) => {
          const hTotal = (b.total / max) * 100;
          const hId = !isToday && b.identified > 0 ? (b.identified / max) * 100 : 0;
          return (
            <div
              key={b.label}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${b.label}: ${b.total} event${b.total !== 1 ? "s" : ""}`}
            >
              <span className="text-[9px] tabular-nums text-gv-muted opacity-0 transition-opacity group-hover:opacity-100">
                {b.total > 0 ? b.total : ""}
              </span>
              <div className="relative flex w-full max-w-[28px] flex-col justify-end" style={{ height: isToday ? "6rem" : "7rem" }}>
                {!isToday && hId > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-emerald-500/70"
                    style={{ height: `${hId}%` }}
                  />
                )}
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    b.total > 0 ? "bg-blue-500/75" : "bg-gv-border-subtle",
                  )}
                  style={{ height: `${Math.max(b.total > 0 ? 8 : 4, hTotal)}%` }}
                />
              </div>
              <span className="max-w-full truncate text-center text-[8px] text-gv-muted sm:text-[9px]">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
