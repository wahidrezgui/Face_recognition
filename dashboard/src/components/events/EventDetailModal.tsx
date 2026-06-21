"use client";

import { useState } from "react";
import { type GateEvent } from "@/lib/api";
import { formatLocalDateLong, formatLocalTime } from "@/lib/datetime";
import { statusColor } from "@/components/events/EventCard";

export default function EventDetailModal({
  event,
  onClose,
}: {
  event: GateEvent;
  onClose: () => void;
}) {
  const col = statusColor(event.status);
  const faceSrc = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "#0a1020",
          border: "1px solid #1a2640",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a2640" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#e2e8f0", fontFamily: "'Oxanium', monospace" }}>
            Event Details
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        {/* Face image */}
        {faceSrc && (
          <div className="flex justify-center px-5 py-4 border-b" style={{ borderColor: "#1a2640", background: "rgba(255,255,255,0.02)" }}>
            <img
              src={faceSrc}
              alt="Event face"
              className="rounded-lg object-cover max-h-64"
              style={{ border: "1px solid #1a2640" }}
            />
          </div>
        )}

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Person</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {event.personName === "UNKNOWN" ? "Unidentified" : event.personName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Status</p>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold mt-0.5"
                style={{ color: col, background: `${col}12`, border: `1px solid ${col}28` }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: col }} />
                {event.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Confidence</p>
              <p className="text-sm font-mono text-white mt-0.5">{Math.round(event.confidence * 100)}%</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Date</p>
              <p className="text-sm text-white mt-0.5">
                {formatLocalDateLong(event.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Time</p>
              <p className="text-sm font-mono text-white mt-0.5">
                {formatLocalTime(event.timestamp)}
              </p>
            </div>
            {event.department && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Department</p>
                <p className="text-sm text-white mt-0.5">{event.department}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Event ID</p>
              <p className="text-sm font-mono text-gv-muted mt-0.5">{event.eventId.slice(0, 8)}…</p>
            </div>
          </div>

          {event.age != null && (
            <div className="border-t pt-3" style={{ borderColor: "#1a2640" }}>
              <div className="grid grid-cols-3 gap-3">
                {event.age != null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Age</p>
                    <p className="text-sm text-white mt-0.5">{event.age}</p>
                  </div>
                )}
                {event.gender && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Gender</p>
                    <p className="text-sm capitalize text-white mt-0.5">{event.gender}</p>
                  </div>
                )}
                {event.emotion && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">Emotion</p>
                    <p className="text-sm capitalize text-white mt-0.5">{event.emotion}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: "#1a2640" }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "transparent",
              border: "1px solid #1a2640",
              color: "#64748b",
              fontFamily: "'Oxanium', monospace",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
