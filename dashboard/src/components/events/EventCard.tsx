"use client";

import { memo, useState } from "react";
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

// ── Delete confirm button ──────────────────────────────────────
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); setConfirming(false); }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all"
        style={{
          background: "rgba(248,113,113,0.18)",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.4)",
          fontFamily: "'Oxanium', monospace",
        }}
        title="Click again to confirm delete"
      >
        Confirm?
      </button>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); setTimeout(() => setConfirming(false), 3000); }}
      className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-all opacity-0 group-hover:opacity-100"
      style={{
        background: "transparent",
        color: "#64748b",
        border: "1px solid rgba(100,116,139,0.25)",
        fontFamily: "'Oxanium', monospace",
      }}
      title="Delete event"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Event card row ─────────────────────────────────────────────
export const EventCard = memo(function EventCard({
  event,
  onViewDetails,
  onReview,
  onDelete,
}: {
  event: GateEvent;
  onViewDetails?: (event: GateEvent) => void;
  onReview?: (event: GateEvent) => void;
  onDelete?: (eventId: string) => void;
}) {
  const col      = statusColor(event.status);
  const isReview = event.status === "NeedsReview";
  const time     = new Date(event.timestamp);

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

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Review button */}
        {onReview && (
          <button
            onClick={(e) => { e.stopPropagation(); onReview(event); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all"
            style={{
              background: "rgba(245,158,11,0.10)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.28)",
              fontFamily: "'Oxanium', monospace",
            }}
            title="Review event: link person or enroll face"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Review
          </button>
        )}

        {/* View button */}
        <button
          onClick={() => onViewDetails?.(event)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all"
          style={{
            background: "rgba(99,102,241,0.08)",
            color: "#818cf8",
            border: "1px solid rgba(99,102,241,0.22)",
            fontFamily: "'Oxanium', monospace",
          }}
          title="View event details"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          View
        </button>

        {/* Delete (ghost, shows on hover) */}
        {onDelete && <DeleteButton onDelete={() => onDelete(event.eventId)} />}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.event.eventId === next.event.eventId &&
  prev.event.confidence === next.event.confidence &&
  prev.event.status === next.event.status &&
  prev.onViewDetails === next.onViewDetails &&
  prev.onReview === next.onReview &&
  prev.onDelete === next.onDelete,
);
