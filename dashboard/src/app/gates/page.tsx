"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchGates, GateStatus } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

function StatusDot({ gate }: { gate: GateStatus }) {
  if (!gate.online)
    return <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Offline" />;
  if (!gate.status?.camera_open)
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Online – camera not open" />;
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" title="Online" />;
}

function StatusLabel({ gate }: { gate: GateStatus }) {
  if (!gate.online) return <span className="text-[10px] font-medium text-red-400">OFFLINE</span>;
  if (!gate.status?.camera_open) return <span className="text-[10px] font-medium text-amber-400">DEGRADED</span>;
  return <span className="text-[10px] font-medium text-emerald-400">ONLINE</span>;
}

function GateCard({ gate }: { gate: GateStatus }) {
  const stats = gate.status?.stats;
  return (
    <div className="rounded border border-[#1a2640] bg-[#0d1a2f] p-5">
      <div className="mb-4 flex items-center gap-2">
        <StatusDot gate={gate} />
        <StatusLabel gate={gate} />
        <span className="ml-auto text-sm font-semibold text-gray-200">{gate.name}</span>
      </div>

      {gate.online && gate.status && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-gray-500">Direction</span>
            <span className="capitalize text-gray-300">{gate.status.direction}</span>
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
          </div>

          {stats && (
            <>
              <div className="mb-3 h-px bg-[#1a2640]" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <span className="text-gray-500">Frames captured</span>
                <span className="text-gray-300">{stats.frames_captured.toLocaleString()}</span>
                <span className="text-gray-500">Faces detected</span>
                <span className="text-gray-300">{stats.faces_detected.toLocaleString()}</span>
                <span className="text-gray-500">Identifications</span>
                <span className="text-gray-300">{stats.events_sent.toLocaleString()}</span>
                <span className="text-gray-500">Windows processed</span>
                <span className="text-gray-300">{stats.windows_processed.toLocaleString()}</span>
                <span className="text-gray-500">Backend errors</span>
                <span className={stats.backend_errors > 0 ? "text-amber-400" : "text-gray-300"}>
                  {stats.backend_errors}
                </span>
                <span className="text-gray-500">Circuit breaker</span>
                <span className={stats.circuit_open ? "text-red-400" : "text-emerald-400"}>
                  {stats.circuit_open ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </>
          )}
        </>
      )}

      {!gate.online && (
        <p className="mt-2 text-xs text-gray-600">Gate AI service is unreachable.</p>
      )}

      <div className="mt-4 border-t border-[#1a2640] pt-4">
        <Link
          href={`/config?gateId=${gate.id}`}
          className="inline-block rounded border border-blue-600/40 bg-blue-700/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-700/30"
        >
          Configure Source
        </Link>
      </div>
    </div>
  );
}

export default function GatesPage() {
  const [gates, setGates] = useState<GateStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    try {
      const data = await fetchGates();
      setGates(data);
      setLastUpdated(new Date());
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      <PageHeader
        title="Gates"
        subtitle="Edge node status and metrics"
      />
      <div className="mx-auto w-full max-w-4xl flex-1 p-6">
        {loading && gates.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading gate status...</div>
        ) : gates.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">No gates configured.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gates.map((gate) => (
                <GateCard key={gate.id} gate={gate} />
              ))}
            </div>
            {lastUpdated && (
              <p className="mt-4 text-right text-[10px] text-gray-700">
                Last updated: {lastUpdated.toLocaleTimeString()} · auto-refreshes every 15s
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
