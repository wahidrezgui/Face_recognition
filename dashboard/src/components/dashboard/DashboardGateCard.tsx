"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { gateStreamUrl, type GateStatus } from "@/lib/api";
import { IconDot } from "@/components/icons";

interface DashboardGateCardProps {
  gate: GateStatus;
  onFocus: (id: string) => void;
}

export const DashboardGateCard = memo(function DashboardGateCard({ gate, onFocus }: DashboardGateCardProps) {
  const [previewStream, setPreviewStream] = useState(false);
  const [streamErr, setStreamErr] = useState(false);
  const isLive = gate.online && (gate.status?.camera_open ?? false);

  return (
    <div className="flex flex-col gap-2 rounded border border-[#1a2640] bg-[#0d1a2f] p-3">
      <div className="flex items-center gap-2">
        <IconDot online={isLive} />
        <span className="truncate text-xs font-medium text-gray-200">{gate.name}</span>
        <span
          className={`ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${isLive ? "border-emerald-800 bg-emerald-950 text-emerald-400" : "border-red-900 bg-red-950 text-red-400"
            }`}
        >
          {isLive ? "LIVE" : "OFF"}
        </span>
      </div>

      {isLive && previewStream && !streamErr && (
        <div className="aspect-video overflow-hidden rounded bg-black">
          <img
            src={gateStreamUrl(gate.id)}
            alt={gate.name}
            className="h-full w-full object-contain"
            onError={() => setStreamErr(true)}
          />
        </div>
      )}

      {isLive && !previewStream && (
        <button
          type="button"
          onClick={() => setPreviewStream(true)}
          className="aspect-video rounded border border-dashed border-[#1a2640] bg-black/40 text-[10px] text-gray-500 transition-colors hover:border-blue-600/40 hover:text-blue-400"
        >
          Click to preview stream
        </button>
      )}

      {gate.online && gate.status && (
        <div className="grid grid-cols-2 gap-x-3 text-[10px]">
          <span className="text-gray-600">FPS</span>
          <span className="text-gray-400">{gate.status.processing_fps}</span>
          {gate.status.stats && (
            <>
              <span className="text-gray-600">Faces today</span>
              <span className="text-gray-400">{gate.status.stats.faces_detected.toLocaleString()}</span>
            </>
          )}
        </div>
      )}

      {!gate.online && <p className="text-[10px] text-gray-600">Gate AI service unreachable</p>}

      <div className="flex gap-2">
        <button
          onClick={() => onFocus(gate.id)}
          disabled={!isLive}
          className="flex-1 rounded border border-blue-600/30 py-1 text-[10px] text-blue-400 transition-colors hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Focus Stream
        </button>
        <Link
          href={`/config?gateId=${gate.id}`}
          className="rounded border border-[#1a2640] px-2 py-1 text-[10px] text-gray-500 transition-colors hover:text-gray-300"
        >
          Config
        </Link>
      </div>
    </div>
  );
});
