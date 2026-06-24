"use client";

import type { GateStatus } from "@/lib/api";

interface GateServiceControlsProps {
  gateOnline: boolean | null;
  hasStartCommand: boolean;
  serviceAction: "stopping" | "starting" | null;
  statusLabel: string;
  onStop: () => void;
  onStart: () => void;
}

export function GateServiceControls({
  gateOnline,
  hasStartCommand,
  serviceAction,
  statusLabel,
  onStop,
  onStart,
}: GateServiceControlsProps) {
  return (
    <div className="flex items-center justify-between rounded border border-[#1a2640] bg-[#0d1a2f] px-4 py-3">
      <span className="text-xs font-medium text-gray-300">AI Service — {statusLabel}</span>
      <div className="flex gap-2">
        {gateOnline ? (
          <button
            type="button"
            disabled={serviceAction !== null}
            onClick={onStop}
            className="rounded border border-red-600/40 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50"
          >
            {serviceAction === "stopping" ? "Stopping…" : "Stop Service"}
          </button>
        ) : (
          <button
            type="button"
            disabled={serviceAction !== null || gateOnline === null || !hasStartCommand}
            onClick={onStart}
            title={!hasStartCommand ? "No start command configured — add one in Gate Settings below" : undefined}
            className="rounded border border-emerald-600/40 bg-emerald-900/20 px-4 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-900/30 disabled:opacity-50"
          >
            {serviceAction === "starting" ? "Starting…" : "Start Service"}
          </button>
        )}
      </div>
    </div>
  );
}
