"use client";

import { Switch } from "@/components/ui/switch";
import { inputCls, labelCls } from "./gate-form-styles";

interface WelcomeWorkflowConfigProps {
  welcomeCooldown: number;
  bufferTrackExpiry: number;
  bufferPersonDedup: number;
  refireScoreDelta: number;
  minTrackHits: number;
  deskDisplaySeconds: number;
  deskLookbackSeconds: number;
  showNeedsReviewOnDesk: boolean;
  loaded: boolean;
  onWelcomeCooldownChange: (v: number) => void;
  onBufferTrackExpiryChange: (v: number) => void;
  onBufferPersonDedupChange: (v: number) => void;
  onRefireScoreDeltaChange: (v: number) => void;
  onMinTrackHitsChange: (v: number) => void;
  onDeskDisplaySecondsChange: (v: number) => void;
  onDeskLookbackSecondsChange: (v: number) => void;
  onShowNeedsReviewChange: (v: boolean) => void;
}

export function WelcomeWorkflowConfig({
  welcomeCooldown,
  bufferTrackExpiry,
  bufferPersonDedup,
  refireScoreDelta,
  minTrackHits,
  deskDisplaySeconds,
  deskLookbackSeconds,
  showNeedsReviewOnDesk,
  loaded,
  onWelcomeCooldownChange,
  onBufferTrackExpiryChange,
  onBufferPersonDedupChange,
  onRefireScoreDeltaChange,
  onMinTrackHitsChange,
  onDeskDisplaySecondsChange,
  onDeskLookbackSecondsChange,
  onShowNeedsReviewChange,
}: WelcomeWorkflowConfigProps) {
  const fields = [
    { label: "Welcome cooldown (s)", value: welcomeCooldown, set: onWelcomeCooldownChange, min: 1, max: 120, step: 1 },
    { label: "Buffer track expiry (s)", value: bufferTrackExpiry, set: onBufferTrackExpiryChange, min: 1, max: 30, step: 1 },
    { label: "Person dedup window (s)", value: bufferPersonDedup, set: onBufferPersonDedupChange, min: 0, max: 30, step: 1 },
    { label: "Refire score delta", value: refireScoreDelta, set: onRefireScoreDeltaChange, min: 0.01, max: 0.2, step: 0.01 },
    { label: "Min track hits", value: minTrackHits, set: onMinTrackHitsChange, min: 1, max: 10, step: 1 },
    { label: "Desk display (s)", value: deskDisplaySeconds, set: onDeskDisplaySecondsChange, min: 1, max: 60, step: 1 },
    { label: "Desk lookback (s)", value: deskLookbackSeconds, set: onDeskLookbackSecondsChange, min: 1, max: 300, step: 1 },
  ] as const;

  return (
    <section>
      <h2 className="mb-1 text-sm font-bold tracking-wide">Welcome Workflow</h2>
      <p className="mb-4 text-xs text-gv-muted">
        Controls dedup, buffering, and desk display timing. Restart the AI service after changing track/refire settings.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.label}>
            <label className={labelCls}>{field.label}</label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={!loaded}
              value={field.value}
              onChange={(e) => {
                const v = field.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                if (!isNaN(v)) field.set(v);
              }}
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Switch
          id="show-needs-review"
          checked={showNeedsReviewOnDesk}
          disabled={!loaded}
          onCheckedChange={onShowNeedsReviewChange}
        />
        <label htmlFor="show-needs-review" className="text-xs text-gray-400">
          Show NeedsReview events on desk kiosk (default: Identified only)
        </label>
      </div>
    </section>
  );
}
