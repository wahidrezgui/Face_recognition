"use client";

import { IconCamera, IconDot } from "@/components/icons";
import { PanelHeader } from "@/components/face-display";
import type { GateStatus } from "@/lib/api";

interface GateSelectorListProps {
  gates: GateStatus[];
  selectedGate?: string;
  onSelectGate: (id: string | undefined) => void;
}

export function GateSelectorList({ gates, selectedGate, onSelectGate }: GateSelectorListProps) {
  return (
    <div className="mt-auto">
      <PanelHeader icon={<IconCamera />} title="Gates" />
      {gates.length === 0 && (
        <div className="px-4 py-2.5 text-[10px] text-gray-500">No gates detected yet</div>
      )}
      {gates.map((g) => {
        const gateId = g.id.trim().toLowerCase();
        return (
          <div
            key={g.id}
            onClick={() => onSelectGate(selectedGate === gateId ? undefined : gateId)}
            className={`flex cursor-pointer items-center gap-2.5 border-b border-[#111f33] px-4 py-2.5 hover:bg-[#0d1a2f] ${selectedGate === gateId ? "bg-[#0d1a2f]" : ""}`}
          >
            <IconDot online={g.online && (g.status?.camera_open ?? false)} />
            <div>
              <p className="text-xs font-medium text-gray-200">{g.name}</p>
              <p className="text-[10px] text-gray-600">{selectedGate === gateId ? "Selected" : "Click to filter"}</p>
            </div>
            <span
              className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] ${g.online && g.status?.camera_open
                ? "border-emerald-800 bg-emerald-950 text-emerald-400"
                : "border-red-900 bg-red-950 text-red-400"
                }`}
            >
              {g.online && g.status?.camera_open ? "LIVE" : "OFF"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
