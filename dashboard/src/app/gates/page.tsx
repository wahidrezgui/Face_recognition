"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchGates, createGate } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { GateCard } from "@/components/gates/GateCard";
import { inputCls, labelCls } from "@/components/gates/gate-form-styles";

const emptyCreateForm = { name: "", pythonUrl: "", apiKey: "", startCommand: "" };

export default function GatesPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  const { data: gates = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["gates"],
    queryFn: fetchGates,
    refetchInterval: 15_000,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [createForm, router],
  );

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      <PageHeader title="Gates" subtitle="Click a gate to configure it" />
      <div className="mx-auto w-full max-w-4xl flex-1 p-6">
        <div className="mb-6">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setCreateError("");
              }}
              className="rounded border border-blue-600/40 bg-blue-700/20 px-4 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-700/30"
            >
              + Add Gate
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 rounded border border-[#1a2640] bg-[#0d1a2f] p-5">
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
                  <p className="mt-1 text-[10px] text-gray-600">
                    Shell command to start this gate&apos;s Python service.
                  </p>
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
                  onClick={() => {
                    setShowCreate(false);
                    setCreateForm(emptyCreateForm);
                  }}
                  className="rounded border border-[#1a2640] px-4 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {isLoading && gates.length === 0 ? (
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
