"use client";

import { useState, useEffect, useCallback } from "react";
import { setVideoSource } from "@/lib/api";

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
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load current camera source on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/vision/stream/status");
        if (!res.ok) return;
        const data = await res.json();
        const src: string = data.camera_source || "";
        if (!src) return;

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
      } catch {
        // service not reachable — keep defaults
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await setVideoSource(getCameraSource());
      setResult({ ok: true, message: `Source set to "${res.camera_source}"${res.message ? ". " + res.message : ""}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({ ok: false, message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#07090f", color: "#e2e8f0" }}>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-lg font-bold mb-1 tracking-wide">Video Source Configuration</h1>
        <p className="text-xs text-gray-500 mb-6">Change the camera input source. The AI service will restart automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                  className={`p-3 rounded border text-left transition-colors ${
                    sourceType === opt.value
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

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || (sourceType === "rtsp" && !rtspUrl)}
            className="w-full py-2.5 rounded text-xs font-semibold transition-colors bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {saving ? "Applying..." : "Apply & Restart"}
          </button>
        </form>

        {/* Result feedback */}
        {result && (
          <div
            className={`mt-4 p-3 rounded border text-xs ${
              result.ok
                ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-300"
                : "bg-red-900/30 border-red-700/40 text-red-300"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
