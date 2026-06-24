import type { EventActivityRange } from "@/lib/api";

const PERIOD_TOTAL_LABEL: Record<EventActivityRange, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
};

interface AccessLogStatsCardsProps {
  stats?: { total: number; autoCount: number; manualCount: number } | null;
  period: EventActivityRange;
}

export function AccessLogStatsCards({ stats, period }: AccessLogStatsCardsProps) {
  if (!stats) return null;
  const cards = [
    { label: PERIOD_TOTAL_LABEL[period], value: stats.total, col: "#e2e8f0" },
    { label: "Auto-validated", value: stats.autoCount, col: "#22d3a5" },
    { label: "Manual", value: stats.manualCount, col: "#818cf8" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
