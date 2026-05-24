"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { setVideoSource, fetchTrainingMode, setTrainingMode, fetchLogUnknown, setLogUnknown } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

/** Infer source type from a camera_source string */
function inferSourceType(source: string): SourceType {
  if (source.startsWith("rtsp://") || source.startsWith("rtmp://"))
    return "rtsp";
  if (source.endsWith(".mp4") || source.endsWith(".avi") || source.endsWith(".mov") || source.includes("/") || source.includes("\\"))
    return "video";
  if (source.startsWith("http://") || source.startsWith("https://"))
    return "video";
  return "webcam";
}

type SourceType = "webcam" | "video" | "rtsp";

interface CameraInfo {
  index: number;
  name: string;
}

export default function ConfigPage() {
  const [sourceType, setSourceType] = useState<SourceType>("webcam");
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [camLoading, setCamLoading] = useState(true);
  const [selectedCam, setSelectedCam] = useState("0");
  const [customIndex, setCustomIndex] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [videoPath, setVideoPath] = useState("sample.mp4");
  const [rtspUrl, setRtspUrl] = useState("");
  const [direction, setDirection] = useState<"entry" | "exit">("entry");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "warning" | "error"; message: string } | null>(null);
  const [trainingMode, setTrainingModeState] = useState(false);
  const [trainingLoaded, setTrainingLoaded] = useState(false);
  const [logUnknown, setLogUnknownState] = useState(false);
  const [logUnknownLoaded, setLogUnknownLoaded] = useState(false);

  // Load current camera source and direction on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/vision/stream/status");
        if (!res.ok) return;
        const data = await res.json();
        const src: string = data.camera_source || "";
        if (src) {
          const kind = inferSourceType(src);
          setSourceType(kind);
          switch (kind) {
            case "webcam":
              setSelectedCam(src);
              setUseCustom(false);
              break;
            case "video":
              setVideoPath(src);
              break;
            case "rtsp":
              setRtspUrl(src);
              break;
          }
        }
        if (data.direction === "exit" || data.direction === "entry") {
          setDirection(data.direction);
        }
      } catch {
        // service not reachable — keep defaults
      }
    })();
  }, []);

  // Load training mode on mount
  useEffect(() => {
    (async () => {
      try {
        const { enabled } = await fetchTrainingMode();
        setTrainingModeState(enabled);
      } catch {
        // endpoint not available — keep default
      } finally {
        setTrainingLoaded(true);
      }
    })();
  }, []);

  // Load log-unknown setting on mount
  useEffect(() => {
    (async () => {
      try {
        const { enabled } = await fetchLogUnknown();
        setLogUnknownState(enabled);
      } catch {
        // endpoint not available — keep default
      } finally {
        setLogUnknownLoaded(true);
      }
    })();
  }, []);

  const fetchCameras = useCallback(async () => {
    setCamLoading(true);
    try {
      const res = await fetch("/vision/cameras");
      if (res.ok) {
        const list: CameraInfo[] = await res.json();
        setCameras(list);
      }
    } catch {
      // service not reachable
    } finally {
      setCamLoading(false);
    }
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  function getCameraSource(): string {
    switch (sourceType) {
      case "webcam": return useCustom ? customIndex : selectedCam;
      case "video": return videoPath;
      case "rtsp": return rtspUrl;
    }
  }

  async function handleApplyRestart() {
    setSaving(true);
    setResult(null);
    try {
      await setTrainingMode(trainingMode);
      await setLogUnknown(logUnknown);
      const res = await setVideoSource(getCameraSource(), direction);
      const dirMsg = `direction: ${res.direction ?? direction}`;
      const msg = `Source set to "${res.camera_source}" (${dirMsg})${res.message ? ". " + res.message : ""}`;
      if (res.status === "warning") {
        setResult({ kind: "warning", message: msg });
        toast.warning(res.message || "Config saved – camera not yet ready");
      } else {
        setResult({ kind: "ok", message: msg });
        toast.success("Configuration applied — AI service restarting");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({ kind: "error", message: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      <PageHeader
        title="Configuration"
        subtitle="Video source, gate direction, and training mode"
      />
      <div className="mx-auto w-full max-w-xl flex-1 p-6">
        <h2 className="mb-1 text-sm font-bold tracking-wide">Video Source</h2>
        <p className="mb-6 text-xs text-gv-muted">Change the camera input source.</p>

        <div className="space-y-5">
          {/* Source type selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Source Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "webcam" as SourceType, label: "Webcam", desc: "Local camera device" },
                { value: "video" as SourceType, label: "Video File", desc: "Sample or recorded video" },
                { value: "rtsp" as SourceType, label: "RTSP Stream", desc: "IP camera or network stream" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourceType(opt.value)}
                  className={`p-3 rounded border text-left transition-colors ${sourceType === opt.value
                      ? "bg-blue-700/30 border-blue-600/40 text-blue-300"
                      : "bg-[#0d1a2f] border-[#1a2640] text-gray-400 hover:border-gray-600"
                    }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Webcam */}
          {sourceType === "webcam" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Camera Device</label>
              {camLoading ? (
                <div className="text-xs text-gray-500 py-2">Scanning for cameras...</div>
              ) : cameras.length > 0 ? (
                <>
                  <select
                    value={useCustom ? " custom " : selectedCam}
                    onChange={(e) => {
                      if (e.target.value === " custom ") {
                        setUseCustom(true);
                      } else {
                        setUseCustom(false);
                        setSelectedCam(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 focus:outline-none focus:border-blue-500"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.index} value={String(cam.index)}>
                        {cam.name}
                      </option>
                    ))}
                    <option value=" custom ">Other (specify index)</option>
                  </select>
                  {useCustom && (
                    <input
                      type="text"
                      value={customIndex}
                      onChange={(e) => setCustomIndex(e.target.value)}
                      placeholder="Camera index (0, 1, 2, ...)"
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
                    placeholder="Camera index (0, 1, 2, ...)"
                    className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </>
              )}
              <p className="text-[10px] text-gray-600">
                {cameras.length > 0
                  ? "Select a camera from the list, or choose 'Other' to enter a device index."
                  : "Refresh the page after starting the AI service to detect cameras."}
              </p>
            </div>
          )}

          {/* Video file */}
          {sourceType === "video" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Video File Path</label>
              <input
                type="text"
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                placeholder="sample.mp4"
                className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-600">Relative to the AI service directory, or an absolute path.</p>
            </div>
          )}

          {/* RTSP */}
          {sourceType === "rtsp" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">RTSP Stream URL</label>
              <input
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="rtsp://192.168.1.100:554/stream1"
                className="w-full px-3 py-2 rounded text-xs bg-[#0d1a2f] border border-[#1a2640] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-600">Full RTSP URL including protocol and credentials if needed.</p>
            </div>
          )}

          {/* Direction selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Gate Direction</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "entry" as const, label: "Entry", desc: "People entering (default)" },
                { value: "exit" as const, label: "Exit", desc: "People leaving" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDirection(opt.value)}
                  className={`p-3 rounded border text-left transition-colors ${direction === opt.value
                      ? "bg-emerald-700/30 border-emerald-600/40 text-emerald-300"
                      : "bg-[#0d1a2f] border-[#1a2640] text-gray-400 hover:border-gray-600"
                    }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator className="my-8 bg-gv-border" />
          <section className="mb-8">
            <h2 className="mb-1 text-sm font-bold tracking-wide">Log Unknown Events</h2>
            <p className="mb-4 text-xs text-gv-muted">
              When enabled, <strong className="text-gray-400">all</strong> detections are stored in the gate events log,
              including unrecognized persons. When disabled, only identified events are recorded.
            </p>
            <div className="flex items-center gap-3">
              <Switch
                id="log-unknown"
                checked={logUnknown}
                disabled={!logUnknownLoaded}
                onCheckedChange={setLogUnknownState}
              />
              <label htmlFor="log-unknown" className="text-xs text-gray-400">
                {logUnknownLoaded
                  ? logUnknown
                    ? "ON — storing all detections"
                    : "OFF — storing only identified"
                  : "Loading..."}
              </label>
            </div>
          </section>

          <Separator className="my-8 bg-gv-border" />
          <section className="mb-8">
            <h2 className="mb-1 text-sm font-bold tracking-wide">Training Mode</h2>
            <p className="mb-4 text-xs text-gv-muted">
              When enabled, unrecognized detections are stored in the training events table for review
              and manual linking. When disabled, only identified events are stored.
            </p>
            <div className="flex items-center gap-3">
              <Switch
                id="training-mode"
                checked={trainingMode}
                disabled={!trainingLoaded}
                onCheckedChange={setTrainingModeState}
              />
              <label htmlFor="training-mode" className="text-xs text-gray-400">
                {trainingLoaded
                  ? trainingMode
                    ? "ON — storing all detections"
                    : "OFF — storing only identified"
                  : "Loading..."}
              </label>
            </div>
          </section>

          {/* Apply & Restart button at the bottom */}
          <Separator className="my-8 bg-gv-border" />
          <Button
            className="w-full"
            disabled={saving || (sourceType === "rtsp" && !rtspUrl)}
            onClick={handleApplyRestart}
          >
            {saving ? "Applying & Restarting..." : "Apply & Restart"}
          </Button>

          {/* Result feedback */}
          {result && (
            <div
              className={`mt-4 p-3 rounded border text-xs ${
                  result.kind === "ok"
                    ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-300"
                    : result.kind === "warning"
                      ? "bg-amber-900/30 border-amber-700/40 text-amber-300"
                      : "bg-red-900/30 border-red-700/40 text-red-300"
                }`}
            >
              {result.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
