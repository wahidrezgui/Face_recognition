"use client";

import type { EventActivityStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type StatItem = {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
};

function StatTile({ label, value, sub, color }: StatItem) {
  return (
    <div className="rounded-xl border border-gv-border bg-gv-panel px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", color ?? "text-white")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-gv-muted">{sub}</p>}
    </div>
  );
}

export function EventActivityStatsPanel({
  stats,
  isLoading,
}: {
  stats?: EventActivityStats;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl bg-gv-panel" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  const items: StatItem[] = [
    { label: "Total events", value: stats.total },
    {
      label: "Identified",
      value: stats.identified,
      sub: `${pct(stats.identified)}% of total`,
      color: "text-emerald-400",
    },
    {
      label: "Needs review",
      value: stats.needsReview,
      sub: stats.needsReview > 0 ? "Action required" : "All clear",
      color: stats.needsReview > 0 ? "text-amber-400" : "text-gv-muted",
    },
    {
      label: "Unique persons",
      value: stats.uniquePersons,
      color: "text-blue-400",
    },
    {
      label: "Entries / exits",
      value: `${stats.entries} / ${stats.exits}`,
      sub: "Gate direction",
    },
    {
      label: "Avg confidence",
      value: `${Math.round(stats.avgConfidence * 100)}%`,
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <StatTile key={item.label} {...item} />
      ))}
    </div>
  );
}
