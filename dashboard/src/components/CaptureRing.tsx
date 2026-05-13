"use client";

export const ZONES = [
  { id: "center", label: "Look straight ahead", yawMin: -14,  yawMax: 14,  pitchMin: -14, pitchMax: 14  },
  { id: "right",  label: "Turn your head right", yawMin: 14,   yawMax: 999, pitchMin: -20, pitchMax: 20  },
  { id: "down",   label: "Tilt your head down",  yawMin: -20,  yawMax: 20,  pitchMin: 14,  pitchMax: 999 },
  { id: "left",   label: "Turn your head left",  yawMin: -999, yawMax: -14, pitchMin: -20, pitchMax: 20  },
  { id: "up",     label: "Tilt your head up",    yawMin: -20,  yawMax: 20,  pitchMin: -999,pitchMax: -14 },
] as const;

export const FRAMES_PER_ZONE = 3;
export const TOTAL_FRAMES = ZONES.length * FRAMES_PER_ZONE;
export const CAPTURE_MS = 350;
export const POSE_POLL_MS = 250;
export const PADDING = 20;
export const VIDEO_SIZE = 280;
export const WRAP_SIZE = VIDEO_SIZE + PADDING * 2;
const C = WRAP_SIZE / 2;
const VIDEO_R = VIDEO_SIZE / 2;
const TICK_IN = VIDEO_R + 2;
const TICK_OUT = VIDEO_R + 16;
const NUM_TICKS = 60;
const TICKS_PER_ZONE = NUM_TICKS / ZONES.length;

function tickColor(tickIdx: number, zoneIdx: number, zoneFrames: number): string {
  const tickZone = Math.floor(tickIdx / TICKS_PER_ZONE);
  const tickWithinZone = tickIdx % TICKS_PER_ZONE;
  if (tickZone < zoneIdx) return "#22c55e";
  if (tickZone === zoneIdx) {
    const filled = (zoneFrames / FRAMES_PER_ZONE) * TICKS_PER_ZONE;
    return tickWithinZone < filled ? "#22c55e" : "rgba(255,255,255,0.12)";
  }
  return "rgba(255,255,255,0.10)";
}

export function zoneArrow(id: string) {
  switch (id) {
    case "right": return "\u2192";
    case "left":  return "\u2190";
    case "down":  return "\u2193";
    case "up":    return "\u2191";
    default:      return "\u00B7";
  }
}

export function ProgressRing({ zoneIdx, zoneFrames, isProcessing }: { zoneIdx: number; zoneFrames: number; isProcessing: boolean }) {
  return (
    <svg width={WRAP_SIZE} height={WRAP_SIZE} className="absolute inset-0 pointer-events-none">
      {Array.from({ length: NUM_TICKS }, (_, i) => {
        const angle = (i / NUM_TICKS) * 2 * Math.PI - Math.PI / 2;
        const color = isProcessing ? "#22c55e" : tickColor(i, zoneIdx, zoneFrames);
        const isFrontier = !isProcessing && Math.floor((zoneIdx * FRAMES_PER_ZONE + zoneFrames) / TOTAL_FRAMES * NUM_TICKS) === i;
        const x1 = C + TICK_IN * Math.cos(angle);
        const y1 = C + TICK_IN * Math.sin(angle);
        const x2 = C + TICK_OUT * Math.cos(angle);
        const y2 = C + TICK_OUT * Math.sin(angle);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color}
            strokeWidth={isFrontier ? 3.5 : 2.5}
            strokeLinecap="round"
            opacity={color === "rgba(255,255,255,0.10)" ? 0.45 : 1}
          />
        );
      })}
      {ZONES.map((_, zi) => {
        const sepAngle = (zi / ZONES.length) * 2 * Math.PI - Math.PI / 2;
        const sx1 = C + (TICK_IN - 4) * Math.cos(sepAngle);
        const sy1 = C + (TICK_IN - 4) * Math.sin(sepAngle);
        const sx2 = C + (TICK_OUT + 4) * Math.cos(sepAngle);
        const sy2 = C + (TICK_OUT + 4) * Math.sin(sepAngle);
        return <line key={`sep-${zi}`} x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke="#111827" strokeWidth={5} />;
      })}
    </svg>
  );
}
