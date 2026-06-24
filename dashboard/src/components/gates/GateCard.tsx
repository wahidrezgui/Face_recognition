"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gateStreamUrl, deskDisplayUrl, type GateStatus } from "@/lib/api";

export function StatusDot({ gate }: { gate: GateStatus }) {
  if (!gate.online)
    return <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Offline" />;
  if (!gate.status?.camera_open)
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Online – camera not open" />;
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" title="Online" />;
}

export function StatusLabel({ gate }: { gate: GateStatus }) {
  if (!gate.online) return <span className="text-[10px] font-medium text-red-400">OFFLINE</span>;
  if (!gate.status?.camera_open) return <span className="text-[10px] font-medium text-amber-400">DEGRADED</span>;
  return <span className="text-[10px] font-medium text-emerald-400">ONLINE</span>;
}

export const GateCard = memo(function GateCard({ gate }: { gate: GateStatus }) {
  const router = useRouter();
  const [previewStream, setPreviewStream] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const stats = gate.status?.stats;
  const isLive = gate.online && gate.status?.camera_open;

  return (
    <div
      className="group cursor-pointer rounded border border-[#1a2640] bg-[#0d1a2f] p-5 transition-colors hover:border-blue-600/40"
      onClick={() => router.push(`/gates/${gate.id}`)}
    >
      <div className="mb-4 flex items-center gap-2">
        <StatusDot gate={gate} />
        <StatusLabel gate={gate} />
        <span className="ml-auto text-sm font-semibold text-gray-200 transition-colors group-hover:text-blue-200">
          {gate.name}
        </span>
      </div>

      {isLive && previewStream && !streamError && (
        <div className="relative mb-3 aspect-video overflow-hidden rounded bg-black">
          <img
            src={gateStreamUrl(gate.id)}
            alt={`${gate.name} live feed`}
            className="h-full w-full object-contain"
            onError={() => setStreamError(true)}
          />
        </div>
      )}

      {isLive && !previewStream && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewStream(true);
          }}
          className="mb-3 aspect-video w-full rounded border border-dashed border-[#1a2640] bg-black/40 text-[10px] text-gray-500 transition-colors hover:border-blue-600/40 hover:text-blue-400"
        >
          Click to preview stream
        </button>
      )}

      {gate.online && gate.status && (
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-gray-500">FPS</span>
          <span className="text-gray-300">{gate.status.processing_fps}</span>
          {gate.status.camera_source && (
            <>
              <span className="text-gray-500">Source</span>
              <span className="truncate text-gray-300" title={gate.status.camera_source}>
                {gate.status.camera_source}
              </span>
            </>
          )}
          {stats && (
            <>
              <span className="text-gray-500">Faces detected</span>
              <span className="text-gray-300">{stats.faces_detected.toLocaleString()}</span>
              <span className="text-gray-500">Identifications</span>
              <span className="text-gray-300">{stats.events_sent.toLocaleString()}</span>
            </>
          )}
        </div>
      )}

      {!gate.online && <p className="mt-2 text-xs text-gray-600">Gate AI service is unreachable.</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1a2640] pt-4" onClick={(e) => e.stopPropagation()}>
        {gate.online && gate.pythonUrl && (
          <a
            href={gateStreamUrl(gate.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-emerald-600/40 bg-emerald-700/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-700/30"
          >
            Open Stream
          </a>
        )}
        <Link
          href={deskDisplayUrl(gate.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-purple-600/40 bg-purple-700/20 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-700/30"
        >
          Desk Display
        </Link>
      </div>
    </div>
  );
});
