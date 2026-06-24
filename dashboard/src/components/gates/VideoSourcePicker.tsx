"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { inputCls, type SourceType } from "./gate-form-styles";

interface VideoSourcePickerProps {
  sourceType: SourceType;
  cameras: { index: number; name: string }[];
  camLoading: boolean;
  selectedCam: string;
  customIndex: string;
  useCustom: boolean;
  rtspUrl: string;
  processingFps: number;
  processingFpsLoaded: boolean;
  identifyThreshold: number;
  minMatchScore: number;
  autoValidateConfidence: number;
  minFaceConfidence: number;
  recognitionLoaded: boolean;
  logUnknown: boolean;
  logUnknownLoaded: boolean;
  trainingMode: boolean;
  trainingLoaded: boolean;
  configSaving: boolean;
  onSourceTypeChange: (t: SourceType) => void;
  onSelectedCamChange: (v: string) => void;
  onCustomIndexChange: (v: string) => void;
  onUseCustomChange: (v: boolean) => void;
  onRtspUrlChange: (v: string) => void;
  onProcessingFpsChange: (v: number) => void;
  onIdentifyThresholdChange: (v: number) => void;
  onMinMatchScoreChange: (v: number) => void;
  onAutoValidateConfidenceChange: (v: number) => void;
  onMinFaceConfidenceChange: (v: number) => void;
  onLogUnknownChange: (v: boolean) => void;
  onTrainingModeChange: (v: boolean) => void;
  onApplyRestart: () => void;
}

export function VideoSourcePicker({
  sourceType,
  cameras,
  camLoading,
  selectedCam,
  customIndex,
  useCustom,
  rtspUrl,
  processingFps,
  processingFpsLoaded,
  identifyThreshold,
  minMatchScore,
  autoValidateConfidence,
  minFaceConfidence,
  recognitionLoaded,
  logUnknown,
  logUnknownLoaded,
  trainingMode,
  trainingLoaded,
  configSaving,
  onSourceTypeChange,
  onSelectedCamChange,
  onCustomIndexChange,
  onUseCustomChange,
  onRtspUrlChange,
  onProcessingFpsChange,
  onIdentifyThresholdChange,
  onMinMatchScoreChange,
  onAutoValidateConfidenceChange,
  onMinFaceConfidenceChange,
  onLogUnknownChange,
  onTrainingModeChange,
  onApplyRestart,
}: VideoSourcePickerProps) {
  const sliderRows = [
    {
      id: "identify-threshold",
      label: "Identify threshold",
      hint: "Match score required to mark a person as identified (not needs review).",
      value: identifyThreshold,
      set: onIdentifyThresholdChange,
    },
    {
      id: "min-match",
      label: "Min vector match",
      hint: "Lowest Qdrant similarity before a face is treated as unknown.",
      value: minMatchScore,
      set: onMinMatchScoreChange,
    },
    {
      id: "auto-validate",
      label: "Auto-validate",
      hint: "High-confidence events skip manual review in the access log.",
      value: autoValidateConfidence,
      set: onAutoValidateConfidenceChange,
    },
    {
      id: "min-face",
      label: "Min face detection",
      hint: "Python agent ignores faces below this detector confidence.",
      value: minFaceConfidence,
      set: onMinFaceConfidenceChange,
    },
  ] as const;

  return (
    <section>
      <h2 className="mb-1 text-sm font-bold tracking-wide">Video Source</h2>
      <p className="mb-6 text-xs text-gv-muted">Camera input and detection configuration for this gate.</p>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">Source Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "webcam" as SourceType, label: "Webcam", desc: "Local camera device" },
                { value: "rtsp" as SourceType, label: "RTSP Stream", desc: "IP camera / network stream" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSourceTypeChange(opt.value)}
                className={`rounded border p-3 text-left transition-colors ${sourceType === opt.value
                    ? "border-blue-600/40 bg-blue-700/30 text-blue-300"
                    : "border-[#1a2640] bg-[#0d1a2f] text-gray-400 hover:border-gray-600"
                  }`}
              >
                <div className="text-xs font-medium">{opt.label}</div>
                <div className="mt-0.5 text-[10px] opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {sourceType === "webcam" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Camera Device</label>
            {camLoading ? (
              <div className="py-2 text-xs text-gray-500">Scanning for cameras…</div>
            ) : cameras.length > 0 ? (
              <>
                <select
                  value={useCustom ? " custom " : selectedCam}
                  onChange={(e) => {
                    if (e.target.value === " custom ") onUseCustomChange(true);
                    else {
                      onUseCustomChange(false);
                      onSelectedCamChange(e.target.value);
                    }
                  }}
                  className="w-full rounded border border-[#1a2640] bg-[#0d1a2f] px-3 py-2 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
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
                    onChange={(e) => onCustomIndexChange(e.target.value)}
                    placeholder="Camera index (0, 1, 2, …)"
                    className="mt-2 w-full rounded border border-[#1a2640] bg-[#0d1a2f] px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                )}
              </>
            ) : (
              <>
                <div className="py-1 text-xs text-amber-400/80">No cameras detected. Enter index manually:</div>
                <input
                  type="text"
                  value={customIndex}
                  onChange={(e) => {
                    onCustomIndexChange(e.target.value);
                    onUseCustomChange(true);
                  }}
                  placeholder="Camera index (0, 1, 2, …)"
                  className="w-full rounded border border-[#1a2640] bg-[#0d1a2f] px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </>
            )}
          </div>
        )}

        {sourceType === "rtsp" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">RTSP Stream URL</label>
            <input
              type="text"
              value={rtspUrl}
              onChange={(e) => onRtspUrlChange(e.target.value)}
              placeholder="rtsp://192.168.1.100:554/stream1"
              className={inputCls}
            />
          </div>
        )}

        <Separator className="bg-gv-border" />

        <div>
          <h3 className="mb-1 text-xs font-semibold text-gray-300">Processing FPS</h3>
          <p className="mb-3 text-[11px] text-gv-muted">
            Saved in the database and pushed to the agent on Apply. Live value is shown above the video feed.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={30}
              value={processingFps}
              disabled={!processingFpsLoaded}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) onProcessingFpsChange(Math.min(30, Math.max(1, v)));
              }}
              className="w-24 rounded border border-[#1a2640] bg-[#0d1a2f] px-3 py-2 text-xs text-gray-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-gray-400">
              {processingFpsLoaded ? `${processingFps} fps (1–30)` : "Loading…"}
            </span>
          </div>
        </div>

        <Separator className="bg-gv-border" />

        <div>
          <h3 className="mb-1 text-xs font-semibold text-gray-300">Recognition Confidence</h3>
          <p className="mb-3 text-[11px] text-gv-muted">
            Tune how strict identification is. Restart applies face-detection thresholds to the Python agent.
          </p>
          <div className="space-y-4">
            {sliderRows.map((row) => (
              <div key={row.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor={row.id} className="text-xs text-gray-300">
                    {row.label}
                  </label>
                  <span className="text-xs tabular-nums text-gray-400">
                    {recognitionLoaded ? `${Math.round(row.value * 100)}%` : "…"}
                  </span>
                </div>
                <input
                  id={row.id}
                  type="range"
                  min={1}
                  max={99}
                  step={1}
                  disabled={!recognitionLoaded}
                  value={Math.round(row.value * 100)}
                  onChange={(e) => {
                    const pct = parseInt(e.target.value, 10);
                    if (!isNaN(pct)) row.set(Math.min(0.99, Math.max(0.01, pct / 100)));
                  }}
                  className="w-full accent-emerald-500 disabled:opacity-50"
                />
                <p className="mt-1 text-[10px] text-gv-muted">{row.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-gv-border" />

        <div>
          <h3 className="mb-1 text-xs font-semibold text-gray-300">Log Unknown Events</h3>
          <p className="mb-3 text-[11px] text-gv-muted">Store all detections, including unrecognized persons.</p>
          <div className="flex items-center gap-3">
            <Switch
              id="log-unknown"
              checked={logUnknown}
              disabled={!logUnknownLoaded}
              onCheckedChange={onLogUnknownChange}
            />
            <label htmlFor="log-unknown" className="text-xs text-gray-400">
              {logUnknownLoaded ? (logUnknown ? "ON — storing all detections" : "OFF — identified only") : "Loading…"}
            </label>
          </div>
        </div>

        <Separator className="bg-gv-border" />

        <div>
          <h3 className="mb-1 text-xs font-semibold text-gray-300">Training Mode</h3>
          <p className="mb-3 text-[11px] text-gv-muted">
            Store unrecognized detections in training events for review and linking.
          </p>
          <div className="flex items-center gap-3">
            <Switch
              id="training-mode"
              checked={trainingMode}
              disabled={!trainingLoaded}
              onCheckedChange={onTrainingModeChange}
            />
            <label htmlFor="training-mode" className="text-xs text-gray-400">
              {trainingLoaded ? (trainingMode ? "ON" : "OFF") : "Loading…"}
            </label>
          </div>
        </div>

        <Separator className="bg-gv-border" />

        <Button
          className="w-full"
          disabled={configSaving || (sourceType === "rtsp" && !rtspUrl)}
          onClick={onApplyRestart}
        >
          {configSaving ? "Applying & Restarting…" : "Apply & Restart"}
        </Button>
      </div>
    </section>
  );
}
