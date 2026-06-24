"use client";

import { Switch } from "@/components/ui/switch";

interface KioskSettingsSectionProps {
  speechBuffered: boolean;
  speechBufferedLoaded: boolean;
  onSpeechBufferedChange: (val: boolean) => void;
}

export function KioskSettingsSection({
  speechBuffered,
  speechBufferedLoaded,
  onSpeechBufferedChange,
}: KioskSettingsSectionProps) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-bold tracking-wide">Kiosk Display</h2>
      <p className="mb-4 text-xs text-gv-muted">Settings for the /desk screen attached to this gate.</p>
      <div>
        <h3 className="mb-1 text-xs font-semibold text-gray-300">Voice Greeting Buffer</h3>
        <p className="mb-3 text-[11px] text-gv-muted">
          When enabled, each greeting plays in full before the next one starts. When disabled, a new detection
          immediately interrupts the current greeting.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            id="speech-buffer"
            checked={speechBuffered}
            disabled={!speechBufferedLoaded}
            onCheckedChange={onSpeechBufferedChange}
          />
          <label htmlFor="speech-buffer" className="text-xs text-gray-400">
            {!speechBufferedLoaded
              ? "Loading…"
              : speechBuffered
                ? "ON — queue greetings, play in order"
                : "OFF — interrupt and play immediately"}
          </label>
        </div>
      </div>
    </section>
  );
}
