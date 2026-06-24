"use client";

import { useState } from "react";
import { gateStreamUrl, type GateStatus } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

interface GateLiveFeedPanelProps {
  gateId: string;
  gate: GateStatus;
  processingFps: number;
  processingFpsLoaded: boolean;
  getCameraSource: () => string;
}

export function GateLiveFeedPanel({
  gateId,
  gate,
  processingFps,
  processingFpsLoaded,
  getCameraSource,
}: GateLiveFeedPanelProps) {
  const [streamError, setStreamError] = useState(false);

  if (!gate.online || !gate.status) return null;

  const stats = gate.status.stats;
  const liveFps = gate.status.processing_fps;
  const liveCamera = gate.status.camera_source;
  const runtimeDrift =
    gate.online &&
    gate.status &&
    ((liveFps != null && processingFpsLoaded && liveFps !== processingFps) ||
      (liveCamera != null && liveCamera !== getCameraSource()));

  return (
    <>
      {gate.status.camera_open && (
        <div className="relative aspect-video overflow-hidden rounded border border-[#1a2640] bg-black">
          <img
            src={gateStreamUrl(gateId)}
            alt={`${gate.name} live feed`}
            className="h-full w-full object-contain"
            onError={() => setStreamError(true)}
          />
          {streamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <span className="text-[10px] text-gray-500">Stream unavailable</span>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
        <span className="col-span-2 text-[10px] uppercase tracking-wider text-gv-muted">
          Live runtime (Python agent)
        </span>
        {runtimeDrift && (
          <p className="col-span-2 rounded border border-amber-600/30 bg-amber-900/15 px-2.5 py-1.5 text-[10px] text-amber-300/90">
            Differs from saved config below — click <strong>Apply &amp; Restart</strong> or restart the service to sync.
          </p>
        )}
        <span className="text-gray-500">Processing FPS</span>
        <span className="text-gray-300">{gate.status.processing_fps}</span>
        {gate.status.camera_source && (
          <>
            <span className="text-gray-500">Camera source</span>
            <span className="truncate text-gray-300" title={gate.status.camera_source}>
              {gate.status.camera_source}
            </span>
          </>
        )}
        {stats && (
          <>
            <span className="col-span-2 mt-1 h-px bg-[#1a2640]" />
            <span className="text-gray-500">Frames captured</span>
            <span className="text-gray-300">{stats.frames_captured.toLocaleString()}</span>
            <span className="text-gray-500">Faces detected</span>
            <span className="text-gray-300">{stats.faces_detected.toLocaleString()}</span>
            <span className="text-gray-500">Identifications</span>
            <span className="text-gray-300">{stats.events_sent.toLocaleString()}</span>
            <span className="text-gray-500">Backend errors</span>
            <span className={stats.backend_errors > 0 ? "text-amber-400" : "text-gray-300"}>
              {stats.backend_errors}
            </span>
            <span className="text-gray-500">Circuit breaker</span>
            <span className={stats.circuit_open ? "text-red-400" : "text-emerald-400"}>
              {stats.circuit_open ? "OPEN" : "CLOSED"}
            </span>
          </>
        )}
      </div>
      <Separator className="bg-gv-border" />
    </>
  );
}
