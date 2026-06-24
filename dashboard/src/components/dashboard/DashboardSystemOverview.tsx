"use client";

import type { GateStatus } from "@/lib/api";
import { fetchEventStats } from "@/lib/api";
import { IconCamera, IconChart, IconShield } from "@/components/icons";
import { PanelHeader, StatItem } from "@/components/face-display";
import { GateSelectorList } from "@/components/dashboard/GateSelectorList";

type DashboardSystemOverviewProps = {
  gates: GateStatus[];
  stats?: Awaited<ReturnType<typeof fetchEventStats>>;
  sseGateId?: string;
  onSelectSseGate: (id: string | undefined) => void;
};

export function DashboardSystemOverview({
  gates,
  stats,
  sseGateId,
  onSelectSseGate,
}: DashboardSystemOverviewProps) {
  return (
    <aside className="flex max-h-[38vh] flex-col overflow-hidden bg-gv-panel lg:col-start-1 lg:row-start-1 lg:max-h-none xl:max-h-none">
      <PanelHeader icon={<IconChart />} title="System Overview" />
      <StatItem
        label="Today's Entries"
        value={stats?.todayEntries ?? 0}
        color="text-blue-400"
        icon={<IconCamera />}
      />
      <StatItem
        label="Pending Review"
        value={stats?.pendingReview ?? 0}
        color="text-amber-400"
        icon={<IconShield />}
      />
      <GateSelectorList gates={gates} selectedGate={sseGateId} onSelectGate={onSelectSseGate} />
      <div className="border-t border-[#111f33] px-4 py-3 text-[10px] text-gray-700">
        Confidence thresholds: ≥80% Identified · &lt;80% Review
      </div>
    </aside>
  );
}
