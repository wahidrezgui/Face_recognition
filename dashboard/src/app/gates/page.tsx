"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchGates, gateStreamUrl, GateStatus, createGate, deskDisplayUrl } from "@/lib/api";
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
  const router = useRouter();
  const [streamError, setStreamError] = useState(false);
  const stats = gate.status?.stats;

  return (
    <div
      className="group cursor-pointer rounded border border-[#1a2640] bg-[#0d1a2f] p-5 transition-colors hover:border-blue-600/40"
      onClick={() => router.push(`/gates/${gate.id}`)}
    >
      <div className="mb-4 flex items-center gap-2">
        <StatusDot gate={gate} />
        <StatusLabel gate={gate} />
        <span className="ml-auto text-sm font-semibold text-gray-200 group-hover:text-blue-200 transition-colors">
          {gate.name}
        </span>
      </div>

      {gate.online && gate.status?.camera_open && (
        <div className="relative mb-3 aspect-video overflow-hidden rounded bg-black">
          <img
            src={gateStreamUrl(gate.id)}
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

      {!gate.online && (
        <p className="mt-2 text-xs text-gray-600">Gate AI service is unreachable.</p>
      )}

      {/* External action buttons — stop propagation so card click doesn't fire */}
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
}

const emptyCreateForm = { name: "", pythonUrl: "", apiKey: "", startCommand: "" };

export default function GatesPage() {
  const router = useRouter();
  const [gates, setGates] = useState<GateStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  async function load() {
    try {
      const data = await fetchGates();
      setGates(data);
      setLastUpdated(new Date());
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim() || !createForm.pythonUrl.trim()) {
      setCreateError("Name and Python URL are required.");
      return;
    }
    setCreateSaving(true);
    try {
      const created = await createGate({
        name: createForm.name.trim(),
        pythonUrl: createForm.pythonUrl.trim(),
        apiKey: createForm.apiKey.trim() || undefined,
        startCommand: createForm.startCommand.trim() || undefined,
      });
      router.push(`/gates/${encodeURIComponent(created.id)}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create gate");
    } finally {
      setCreateSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded text-xs bg-[#060f1e] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      <PageHeader title="Gates" subtitle="Click a gate to configure it" />
      <div className="mx-auto w-full max-w-4xl flex-1 p-6">

        {/* Add Gate */}
        <div className="mb-6">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => { setShowCreate(true); setCreateError(""); }}
              className="rounded border border-blue-600/40 bg-blue-700/20 px-4 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-700/30"
            >
              + Add Gate
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="rounded border border-[#1a2640] bg-[#0d1a2f] p-5 space-y-4"
            >
              <h3 className="text-sm font-semibold text-gray-200">New Gate</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Display Name</label>
                  <input
                    className={inputCls}
                    placeholder="Gate C"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>Python Service URL</label>
                  <input
                    className={inputCls}
                    placeholder="http://192.168.1.10:8002"
                    value={createForm.pythonUrl}
                    onChange={(e) => setCreateForm((f) => ({ ...f, pythonUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>API Key (optional)</label>
                  <input
                    type="password"
                    className={inputCls}
                    placeholder="Leave blank to skip"
                    value={createForm.apiKey}
                    onChange={(e) => setCreateForm((f) => ({ ...f, apiKey: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Start Command (optional)</label>
                  <input
                    className={inputCls}
                    placeholder="bash /path/to/run-gate.sh"
                    value={createForm.startCommand}
                    onChange={(e) => setCreateForm((f) => ({ ...f, startCommand: e.target.value }))}
                  />
                  <p className="mt-1 text-[10px] text-gray-600">Shell command to start this gate&apos;s Python service.</p>
                </div>
              </div>
              {createError && <p className="text-xs text-red-400">{createError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createSaving}
                  className="rounded bg-blue-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {createSaving ? "Creating…" : "Create Gate"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateForm(emptyCreateForm); }}
                  className="rounded border border-[#1a2640] px-4 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Gate grid */}
        {loading && gates.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading gate status…</div>
        ) : gates.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">No gates configured. Add one above.</div>
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
