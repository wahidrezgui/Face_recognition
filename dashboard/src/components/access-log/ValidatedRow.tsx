"use client";

import { memo, useState } from "react";
import type { ValidatedEvent } from "@/lib/api";

export function FaceThumbnail({ event }: { event: ValidatedEvent }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64 ? `data:image/jpeg;base64,${event.faceImageBase64}` : null;
  const ini =
    event.personName && event.personName !== "UNKNOWN"
      ? event.personName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : "?";

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: 40, height: 40, background: "#0d1424", border: "2px solid #1e3a5f" }}
    >
      {src && !err ? (
        <img src={src} alt="" onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-blue-400" style={{ fontFamily: "'Oxanium', monospace" }}>
          {ini}
        </span>
      )}
    </div>
  );
}

export function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <button
        onClick={onDelete}
        className="rounded px-2.5 py-1 text-[11px] font-semibold transition-all"
        style={{
          background: "rgba(248,113,113,0.18)",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.35)",
        }}
      >
        Confirm?
      </button>
    );
  }
  return (
    <button
      onClick={() => {
        setConfirming(true);
        setTimeout(() => setConfirming(false), 3000);
      }}
      className="rounded px-2 py-1 text-[11px] font-semibold opacity-0 transition-all group-hover:opacity-100"
      style={{ background: "transparent", color: "#64748b", border: "1px solid rgba(100,116,139,0.2)" }}
      title="Remove from access log"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}

export const ValidatedRow = memo(function ValidatedRow({
  event,
  onDelete,
}: {
  event: ValidatedEvent;
  onDelete: (id: string) => void;
}) {
  const isManual = event.validatedBy === "manual";
  const confPct = Math.round(event.confidence * 100);

  return (
    <div
      className="group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-white/[0.02]"
      style={{
        background: "rgba(10,16,32,0.6)",
        border: "1px solid #1a2640",
        borderLeft: `3px solid ${isManual ? "#818cf8" : "#22d3a5"}`,
      }}
    >
      <FaceThumbnail event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="truncate text-sm font-semibold"
            style={{ color: "#e2e8f0", fontFamily: "'Outfit', sans-serif" }}
          >
            {event.personName === "UNKNOWN" ? "Unidentified" : event.personName}
          </span>
          {event.department && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#64748b",
                border: "1px solid #1e2d47",
              }}
            >
              {event.department}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3">
          <span className="font-mono text-[11px]" style={{ color: confPct >= 90 ? "#22d3a5" : "#64748b" }}>
            {confPct}% conf
          </span>
          {event.emotion && <span className="text-[10px] text-gray-800">{event.emotion}</span>}
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-xs text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</p>
        <p className="mt-0.5 text-[10px] text-gray-700">{new Date(event.timestamp).toLocaleDateString()}</p>
      </div>
      <div className="shrink-0">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            color: isManual ? "#818cf8" : "#22d3a5",
            background: isManual ? "rgba(129,140,248,0.10)" : "rgba(34,211,165,0.08)",
            border: `1px solid ${isManual ? "rgba(129,140,248,0.25)" : "rgba(34,211,165,0.20)"}`,
            fontFamily: "'Oxanium', monospace",
          }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: isManual ? "#818cf8" : "#22d3a5" }}
          />
          {isManual ? "Manual" : "Auto"}
        </span>
      </div>
      <DeleteBtn onDelete={() => onDelete(event.eventId)} />
    </div>
  );
});
