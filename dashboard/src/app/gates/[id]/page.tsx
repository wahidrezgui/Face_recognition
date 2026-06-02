"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  fetchGates, fetchGateStatus, setGateVideoSource,
  fetchGateCameras, fetchGateProcessingFps, setGateProcessingFps,
  fetchTrainingMode, setTrainingMode,
  fetchLogUnknown, setLogUnknown,
  fetchAdminGates, updateGate, deleteGate,
  stopGate, startGate,
  gateStreamUrl, GateStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type SourceType = "webcam" | "video" | "rtsp";

function inferSourceType(source: string): SourceType {
  if (source.startsWith("rtsp://") || source.startsWith("rtmp://")) return "rtsp";
  if (source.startsWith("http://") || source.startsWith("https://")) return "video";
  if (source.endsWith(".mp4") || source.endsWith(".avi") || source.endsWith(".mov") || source.includes("/") || source.includes("\\")) return "video";
  return "webcam";
}

const inputCls = "w-full px-3 py-2 rounded text-xs bg-[#060f1e] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500";
const labelCls = "block text-xs font-medium text-gray-400 mb-1";

export default function GateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gateId = params.id as string;

  const [gate, setGate] = useState<GateStatus | null>(null);
  const [hasStartCommand, setHasStartCommand] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [serviceAction, setServiceAction] = useState<"stopping" | "starting" | null>(null);

  // Edit gate settings
  const [editName, setEditName] = useState("");
  const [editPythonUrl, setEditPythonUrl] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editStartCommand, setEditStartCommand] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editInitialized, setEditInitialized] = useState(false);

  // Video source
  const [sourceType, setSourceType] = useState<SourceType>("webcam");
  const [cameras, setCameras] = useState<{ index: number; name: string }[]>([]);
  const [camLoading, setCamLoading] = useState(true);
  const [selectedCam, setSelectedCam] = useState("0");
  const [customIndex, setCustomIndex] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [videoPath, setVideoPath] = useState("sample.mp4");
  const [rtspUrl, setRtspUrl] = useState("");
  const [direction, setDirection] = useState<"entry" | "exit">("entry");
  const [configSaving, setConfigSaving] = useState(false);

  // Global toggles
  const [trainingMode, setTrainingModeState] = useState(false);
  const [trainingLoaded, setTrainingLoaded] = useState(false);
  const [logUnknown, setLogUnknownState] = useState(false);
  const [logUnknownLoaded, setLogUnknownLoaded] = useState(false);
  const [processingFps, setProcessingFpsState] = useState(3);
  const [processingFpsLoaded, setProcessingFpsLoaded] = useState(false);

  const [streamError, setStreamError] = useState(false);

  const refreshGateStatus = useCallback(async () => {
    try {
      const [gateList, adminList] = await Promise.all([fetchGates(), fetchAdminGates()]);
      const g = gateList.find((x) => x.id === gateId);
      if (!g) { setNotFound(true); return; }
      setGate(g);
      const ag = adminList.find((x) => x.id === gateId);
      setHasStartCommand(!!ag?.startCommand);
      if (!editInitialized) {
        setEditName(g.name);
        setEditPythonUrl(g.pythonUrl ?? "");
        setEditStartCommand(ag?.startCommand ?? "");
        setEditInitialized(true);
      }
    } catch { /* keep stale */ }
  }, [gateId, editInitialized]);

  useEffect(() => {
    refreshGateStatus();
    const iv = setInterval(refreshGateStatus, 5_000);
    return () => clearInterval(iv);
  }, [refreshGateStatus]);

  // Pre-fill video source from live gate status
  useEffect(() => {
    (async () => {
      try {
        const status = await fetchGateStatus(gateId);
        if (!status) return;
        const src = status.camera_source || "";
        if (src) {
          const kind = inferSourceType(src);
          setSourceType(kind);
          if (kind === "webcam") { setSelectedCam(src); setUseCustom(false); }
          else if (kind === "video") setVideoPath(src);
          else setRtspUrl(src);
        }
        if (status.direction === "exit" || status.direction === "entry") setDirection(status.direction);
      } catch { /* gate offline */ }
    })();
  }, [gateId]);

  // Toggles
  useEffect(() => {
    (async () => {
      try { const { enabled } = await fetchTrainingMode(); setTrainingModeState(enabled); }
      catch { } finally { setTrainingLoaded(true); }
    })();
    (async () => {
      try { const { enabled } = await fetchLogUnknown(); setLogUnknownState(enabled); }
      catch { } finally { setLogUnknownLoaded(true); }
    })();
  }, []);

  // Processing FPS
  useEffect(() => {
    (async () => {
      try { const { fps } = await fetchGateProcessingFps(gateId); setProcessingFpsState(fps); }
      catch { } finally { setProcessingFpsLoaded(true); }
    })();
  }, [gateId]);

  // Camera list
  const loadCameras = useCallback(async () => {
    setCamLoading(true);
    try { const list = await fetchGateCameras(gateId); setCameras(list); }
    catch { } finally { setCamLoading(false); }
  }, [gateId]);
  useEffect(() => { loadCameras(); }, [loadCameras]);

  function getCameraSource(): string {
    switch (sourceType) {
      case "webcam": return useCustom ? customIndex : selectedCam;
      case "video": return videoPath;
      case "rtsp": return rtspUrl;
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");
    try {
      const payload: { name?: string; pythonUrl?: string; apiKey?: string | null; startCommand?: string | null } = {};
      if (editName.trim()) payload.name = editName.trim();
      if (editPythonUrl.trim()) payload.pythonUrl = editPythonUrl.trim();
      if (editApiKey.trim()) payload.apiKey = editApiKey.trim();
      payload.startCommand = editStartCommand.trim() || null;
      await updateGate(gateId, payload);
      setEditApiKey("");
      toast.success("Gate settings saved");
      setEditInitialized(false); // re-fetch on next refresh
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleApplyRestart() {
    setConfigSaving(true);
    try {
      await setTrainingMode(trainingMode);
      await setLogUnknown(logUnknown);
      await setGateProcessingFps(gateId, processingFps);
      await setGateVideoSource(gateId, getCameraSource(), direction);
      toast.success("Configuration applied — AI service restarting");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply configuration");
    } finally {
      setConfigSaving(false);
    }
  }

  async function handleStop() {
    setServiceAction("stopping");
    try {
      await stopGate(gateId);
      toast.success("Stop signal sent — AI service shutting down");
      setTimeout(() => refreshGateStatus(), 1_500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to stop service");
    } finally {
      setServiceAction(null);
    }
  }

  async function handleStart() {
    setServiceAction("starting");
    try {
      const res = await startGate(gateId);
      toast.info(res.message || "Start command sent — service is starting up");
      setTimeout(() => refreshGateStatus(), 2_000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start service");
    } finally {
      setServiceAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete gate "${gateId}"? This cannot be undone.`)) return;
    try {
      await deleteGate(gateId);
      router.push("/gates");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete gate");
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-gv-bg text-gv-text">
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-400">Gate &ldquo;{gateId}&rdquo; not found.</p>
          <Link href="/gates" className="text-xs text-blue-400 hover:text-blue-300">← Back to Gates</Link>
        </div>
      </div>
    );
  }

  const gateOnline = gate?.online ?? null;
  const dotColor = gateOnline === null ? "bg-gray-500" : gateOnline ? "bg-emerald-400" : "bg-red-500";
  const statusLabel = gateOnline === null ? "Checking…" : gateOnline ? "Online" : "Offline";
  const stats = gate?.status?.stats;

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      {/* Header */}
      <div className="border-b border-[#1a2640] bg-[#060f1e] px-6 py-4">
        <Link href="/gates" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
          ← Gates
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          <h1 className="text-base font-bold text-gray-100">{gate?.name ?? gateId}</h1>
          <span className="text-[10px] text-gray-600">{gateId}</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">

        {/* Service control */}
        <div className="flex items-center justify-between rounded border border-[#1a2640] bg-[#0d1a2f] px-4 py-3">
          <span className="text-xs font-medium text-gray-300">AI Service — {statusLabel}</span>
          <div className="flex gap-2">
            {gateOnline ? (
              <button
                type="button"
                disabled={serviceAction !== null}
                onClick={handleStop}
                className="rounded border border-red-600/40 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50"
              >
                {serviceAction === "stopping" ? "Stopping…" : "Stop Service"}
              </button>
            ) : (
              <button
                type="button"
                disabled={serviceAction !== null || gateOnline === null || !hasStartCommand}
                onClick={handleStart}
                title={!hasStartCommand ? "No start command configured — add one in Gate Settings below" : undefined}
                className="rounded border border-emerald-600/40 bg-emerald-900/20 px-4 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-900/30 disabled:opacity-50"
              >
                {serviceAction === "starting" ? "Starting…" : "Start Service"}
              </button>
            )}
          </div>
        </div>

        {/* Live feed + stats */}
        {gate?.online && gate.status && (
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
              <span className="text-gray-500">Direction</span>
              <span className="capitalize text-gray-300">{gate.status.direction}</span>
              <span className="text-gray-500">Processing FPS</span>
              <span className="text-gray-300">{gate.status.processing_fps}</span>
              {gate.status.camera_source && (
                <>
                  <span className="text-gray-500">Camera source</span>
                  <span className="truncate text-gray-300" title={gate.status.camera_source}>{gate.status.camera_source}</span>
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
                  <span className={stats.backend_errors > 0 ? "text-amber-400" : "text-gray-300"}>{stats.backend_errors}</span>
                  <span className="text-gray-500">Circuit breaker</span>
                  <span className={stats.circuit_open ? "text-red-400" : "text-emerald-400"}>{stats.circuit_open ? "OPEN" : "CLOSED"}</span>
                </>
              )}
            </div>
            <Separator className="bg-gv-border" />
          </>
        )}

        {/* Gate settings (edit) */}
        <section>
          <h2 className="mb-4 text-sm font-bold tracking-wide">Gate Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Display Name</label>
                <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Python Service URL</label>
                <input className={inputCls} value={editPythonUrl} onChange={(e) => setEditPythonUrl(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>New API Key</label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Leave blank to keep current"
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Start Command</label>
                <input
                  className={inputCls}
                  placeholder="bash /path/to/run-gate.sh"
                  value={editStartCommand}
                  onChange={(e) => setEditStartCommand(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-gray-600">Leave blank to clear.</p>
              </div>
            </div>
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <Button type="submit" disabled={editSaving} variant="outline" size="sm">
              {editSaving ? "Saving…" : "Save Settings"}
            </Button>
          </form>
        </section>

        <Separator className="bg-gv-border" />

        {/* Camera / AI config */}
        <section>
          <h2 className="mb-1 text-sm font-bold tracking-wide">Video Source</h2>
          <p className="mb-6 text-xs text-gv-muted">Camera input and detection configuration for this gate.</p>

          <div className="space-y-5">
            {/* Source type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Source Type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "webcam" as SourceType, label: "Webcam", desc: "Local camera device" },
                  { value: "video" as SourceType, label: "Video File", desc: "Sample or recorded video" },
                  { value: "rtsp" as SourceType, label: "RTSP Stream", desc: "IP camera / network stream" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSourceType(opt.value)}
                    className={`p-3 rounded border text-left transition-colors ${sourceType === opt.value
                      ? "bg-blue-700/30 border-blue-600/40 text-blue-300"
                      : "bg-[#0d1a2f] border-[#1a2640] text-gray-400 hover:border-gray-600"}`}
                  >
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {sourceType === "webcam" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Camera Device</label>
                {camLoading ? (
                  <div className="text-xs text-gray-500 py-2">Scanning for cameras…</div>
                ) : cameras.length > 0 ? (
                  <>
                    <select
                      value={useCustom ? " custom " : selectedCam}
                      onChange={(e) => {
                        if (e.target.value === " custom ") setUseCustom(true);
                        else { setUseCustom(false); setSelectedCam(e.target.value); }
                      }}
                      className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 focus:outline-none focus:border-blue-500"
                    >
                      {cameras.map((cam) => (
                        <option key={cam.index} value={String(cam.index)}>{cam.name}</option>
                      ))}
                      <option value=" custom ">Other (specify index)</option>
                    </select>
                    {useCustom && (
                      <input
                        type="text"
                        value={customIndex}
                        onChange={(e) => setCustomIndex(e.target.value)}
                        placeholder="Camera index (0, 1, 2, …)"
                        className="mt-2 w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs text-amber-400/80 py-1">No cameras detected. Enter index manually:</div>
                    <input
                      type="text"
                      value={customIndex || "0"}
                      onChange={(e) => { setCustomIndex(e.target.value); setUseCustom(true); }}
                      placeholder="Camera index (0, 1, 2, …)"
                      className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </>
                )}
              </div>
            )}

            {sourceType === "video" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Video File Path</label>
                <input
                  type="text"
                  value={videoPath}
                  onChange={(e) => setVideoPath(e.target.value)}
                  placeholder="sample.mp4"
                  className={inputCls}
                />
                <p className="text-[10px] text-gray-600">Relative to the AI service directory, or an absolute path.</p>
              </div>
            )}

            {sourceType === "rtsp" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">RTSP Stream URL</label>
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  className={inputCls}
                />
              </div>
            )}

            {/* Direction */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Gate Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "entry" as const, label: "Entry", desc: "People entering" },
                  { value: "exit" as const, label: "Exit", desc: "People leaving" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDirection(opt.value)}
                    className={`p-3 rounded border text-left transition-colors ${direction === opt.value
                      ? "bg-emerald-700/30 border-emerald-600/40 text-emerald-300"
                      : "bg-[#0d1a2f] border-[#1a2640] text-gray-400 hover:border-gray-600"}`}
                  >
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-gv-border" />

            {/* Processing FPS */}
            <div>
              <h3 className="mb-1 text-xs font-semibold text-gray-300">Processing FPS</h3>
              <p className="mb-3 text-[11px] text-gv-muted">Frames per second sent to face detection. Lower = less CPU.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} max={30}
                  value={processingFps}
                  disabled={!processingFpsLoaded}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setProcessingFpsState(Math.min(30, Math.max(1, v)));
                  }}
                  className="w-24 px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <span className="text-xs text-gray-400">{processingFpsLoaded ? `${processingFps} fps (1–30)` : "Loading…"}</span>
              </div>
            </div>

            <Separator className="bg-gv-border" />

            {/* Log Unknown */}
            <div>
              <h3 className="mb-1 text-xs font-semibold text-gray-300">Log Unknown Events</h3>
              <p className="mb-3 text-[11px] text-gv-muted">Store all detections, including unrecognized persons.</p>
              <div className="flex items-center gap-3">
                <Switch id="log-unknown" checked={logUnknown} disabled={!logUnknownLoaded} onCheckedChange={setLogUnknownState} />
                <label htmlFor="log-unknown" className="text-xs text-gray-400">
                  {logUnknownLoaded ? (logUnknown ? "ON — storing all detections" : "OFF — identified only") : "Loading…"}
                </label>
              </div>
            </div>

            <Separator className="bg-gv-border" />

            {/* Training Mode */}
            <div>
              <h3 className="mb-1 text-xs font-semibold text-gray-300">Training Mode</h3>
              <p className="mb-3 text-[11px] text-gv-muted">Store unrecognized detections in training events for review and linking.</p>
              <div className="flex items-center gap-3">
                <Switch id="training-mode" checked={trainingMode} disabled={!trainingLoaded} onCheckedChange={setTrainingModeState} />
                <label htmlFor="training-mode" className="text-xs text-gray-400">
                  {trainingLoaded ? (trainingMode ? "ON" : "OFF") : "Loading…"}
                </label>
              </div>
            </div>

            <Separator className="bg-gv-border" />

            <Button
              className="w-full"
              disabled={configSaving || (sourceType === "rtsp" && !rtspUrl)}
              onClick={handleApplyRestart}
            >
              {configSaving ? "Applying & Restarting…" : "Apply & Restart"}
            </Button>
          </div>
        </section>

        <Separator className="bg-gv-border" />

        {/* Danger zone */}
        <section className="pb-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-red-400">Danger Zone</h2>
          <div className="rounded border border-red-600/20 bg-red-950/10 p-4">
            <p className="mb-3 text-xs text-gray-500">Permanently delete this gate. This cannot be undone.</p>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-600/40 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
            >
              Delete Gate
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
