"use client";

import { useState } from "react";
import type { GateStatus } from "@/lib/api";
import { IconCamera } from "@/components/icons";
import { PanelHeader } from "@/components/face-display";
import { DashboardGateCard } from "@/components/dashboard/DashboardGateCard";
import { LiveStreamView } from "@/components/dashboard/LiveStreamView";

const SCROLL_STYLE = { scrollbarWidth: "thin" as const, scrollbarColor: "#1e2d4a transparent" };

type DashboardLiveViewPanelProps = {
  gates: GateStatus[];
  streamGateId?: string;
  onFocusGate: (id: string) => void;
  onBackToAllGates: () => void;
};

export function DashboardLiveViewPanel({
  gates,
  streamGateId,
  onFocusGate,
  onBackToAllGates,
}: DashboardLiveViewPanelProps) {
  const [cameraStreamError, setCameraStreamError] = useState(false);

  return (
    <main className="flex min-h-[280px] flex-col overflow-hidden bg-[#080d19] lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-2 xl:row-span-1">
      <div className="shrink-0 border-b border-gv-border">
        <PanelHeader icon={<IconCamera />} title="Live View" />
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        {!streamGateId ? (
          <div className="h-full overflow-y-auto p-4" style={SCROLL_STYLE}>
            <p className="mb-3 text-[10px] uppercase tracking-widest text-gray-600">
              {gates.length === 0 ? "No gates configured" : "Select a gate to focus its stream"}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {gates.map((gate) => (
                <DashboardGateCard key={gate.id} gate={gate} onFocus={onFocusGate} />
              ))}
            </div>
          </div>
        ) : (
          <LiveStreamView
            gateId={streamGateId}
            streamError={cameraStreamError}
            onStreamError={() => setCameraStreamError(true)}
            onClearError={() => setCameraStreamError(false)}
            onBackToAll={onBackToAllGates}
          />
        )}
      </div>
    </main>
  );
}
