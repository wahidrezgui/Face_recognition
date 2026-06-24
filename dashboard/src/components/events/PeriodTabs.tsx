"use client";

import { cn } from "@/lib/utils";
import type { EventActivityRange } from "@/lib/api";

export const PERIOD_TABS: { value: EventActivityRange; label: string; hint: string }[] = [
  { value: "today", label: "Today", hint: "Local midnight → now" },
  { value: "week", label: "This week", hint: "Last 7 days" },
  { value: "month", label: "This month", hint: "Calendar month" },
];

interface PeriodTabsProps {
  period: EventActivityRange;
  onChange: (period: EventActivityRange) => void;
}

export function PeriodTabs({ period, onChange }: PeriodTabsProps) {
  return (
    <div className="shrink-0 border-b border-gv-border bg-gv-panel-header px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
        {PERIOD_TABS.map((t) => {
          const active = period === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
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
  );
}
