"use client";

import { useState } from "react";
import { type GateEvent } from "@/lib/api";

// ── Event helpers ──────────────────────────────────────────────
export function statusColor(s?: string) {
  if (s === "Identified")  return "#22d3a5";
  if (s === "NeedsReview") return "#f59e0b";
  return "#f87171";
}

function statusLabel(s?: string) {
  if (s === "Identified")  return "Identified";
  if (s === "NeedsReview") return "Review";
  return "Unknown";
}

// ── Face + confidence ring ─────────────────────────────────────
function FaceRing({ event }: { event: GateEvent }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;

  const ini =
    event.personName && event.personName !== "UNKNOWN"
      ? event.personName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";

  const col  = statusColor(event.status);
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.max(0, Math.min(1, event.confidence));

  return (
    <div className="relative shrink-0" style={{ width: 58, height: 58 }}>
      <svg className="absolute inset-0" width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
        <circle
          cx="29" cy="29" r={r}
          fill="none"
          stroke={col}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          transform="rotate(-90 29 29)"
          style={{ filter: `drop-shadow(0 0 5px ${col}60)` }}
        />
      </svg>
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{ inset: 7, background: "#0a1020" }}
      >
        {src && !err ? (
          <img src={src} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold" style={{ color: col, fontFamily: "'Oxanium', monospace" }}>
            {ini}
          </span>
        )}
      </div>
      {/* Confidence dot tooltip */}
      <div
        className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold rounded-full flex items-center justify-center"
        style={{
          width: 18, height: 18,
          background: "#0a1020",
          border: `1.5px solid ${col}`,
          color: col,
          fontFamily: "monospace",
        }}
      >
        {Math.round(event.confidence * 100)}
      </div>
    </div>
  );
}

// ── Event card row ─────────────────────────────────────────────
export function EventCard({
  event,
  onApprove,
  onBlock,
  blocking,
}: {
  event: GateEvent;
  onApprove: () => void;
  onBlock: () => void;
  blocking: boolean;
}) {
  const col        = statusColor(event.status);
  const canAct     = event.status === "NeedsReview" || event.status === "Unrecognized";
  const isReview   = event.status === "NeedsReview";
  const time       = new Date(event.timestamp);

  return (
    <div
      className="group relative flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.02]"
      style={{
        background: isReview ? "rgba(245,158,11,0.025)" : "rgba(10,16,32,0.6)",
        border: "1px solid",
        borderColor: isReview ? "rgba(245,158,11,0.18)" : "#1a2640",
        borderLeft: `3px solid ${col}`,
      }}
    >
      {/* Face ring */}
      <FaceRing event={event} />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: "#e2e8f0", fontFamily: "'Outfit', sans-serif" }}
          >
            {event.personName === "UNKNOWN" ? "Unidentified Person" : event.personName}
          </span>
          {event.department && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid #1e2d47" }}
            >
              {event.department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] font-mono font-medium" style={{ color: col }}>
            {Math.round(event.confidence * 100)}% confidence
          </span>
          <span className="text-[10px] text-gray-700 capitalize tracking-wide">{event.direction}</span>
          <span className="text-[10px] font-mono text-gray-800">{event.eventId.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-mono text-gray-400">
          {time.toLocaleTimeString("en-US", { hour12: false })}
        </p>
        <p className="text-[10px] text-gray-700 mt-0.5">
          {time.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{
            color: col,
            background: `${col}12`,
            border: `1px solid ${col}28`,
            fontFamily: "'Oxanium', monospace",
            letterSpacing: "0.02em",
          }}
        >
          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: col }} />
          {statusLabel(event.status)}
        </span>
      </div>

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onApprove()}
            disabled={blocking}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(34,211,165,0.08)",
              color: "#22d3a5",
              border: "1px solid rgba(34,211,165,0.22)",
              fontFamily: "'Oxanium', monospace",
            }}
            title="Open review dialog"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
          <button
            onClick={() => onBlock()}
            disabled={blocking}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(248,113,113,0.08)",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.22)",
              fontFamily: "'Oxanium', monospace",
            }}
            title="Delete event"
          >
            {blocking ? (
              <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
            Block
          </button>
        </div>
      )}
    </div>
  );
}
