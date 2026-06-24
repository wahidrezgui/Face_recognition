"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEventStats, fetchGates } from "@/lib/api";
import { useDashboardEvents } from "@/hooks/useDashboardEvents";
import { useDashboardGateSelection } from "@/hooks/useDashboardGateSelection";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSystemOverview } from "@/components/dashboard/DashboardSystemOverview";
import { DashboardLiveViewPanel } from "@/components/dashboard/DashboardLiveViewPanel";
import { TargetAnalysisPanel } from "@/components/dashboard/TargetAnalysisPanel";

export default function DashboardPage() {
  const { data: gates = [] } = useQuery({
    queryKey: ["gates"],
    queryFn: fetchGates,
    refetchInterval: 15_000,
  });

  const { streamGateId, sseGateId, focusGate, selectSseGate, backToAllGates } =
    useDashboardGateSelection(gates);

  const { data: stats } = useQuery({
    queryKey: ["eventStats"],
    queryFn: fetchEventStats,
    refetchInterval: 15_000,
  });

  const { liveEvents, sseConnected, sseError, needsGate, lastEventAt } = useDashboardEvents(sseGateId);

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col overflow-hidden bg-gv-bg text-gray-100">
      <DashboardHeader />

      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-gv-border-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <DashboardSystemOverview
          gates={gates}
          stats={stats}
          sseGateId={sseGateId}
          onSelectSseGate={selectSseGate}
        />

        <DashboardLiveViewPanel
          gates={gates}
          streamGateId={streamGateId}
          onFocusGate={focusGate}
          onBackToAllGates={backToAllGates}
        />

        <TargetAnalysisPanel
          events={liveEvents}
          sseConnected={sseConnected}
          sseError={sseError}
          needsGate={needsGate}
          lastEventAt={lastEventAt}
        />
      </div>
    </div>
  );
}
