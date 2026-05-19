import React from "react";
import type { GateEvent } from "@/lib/api";
import { getToken } from "@/lib/auth";

function apiImageSrc(url: string): string {
  const key = typeof window !== "undefined" ? getToken() : null;
  return key ? `${url}?token=${encodeURIComponent(key)}` : url;
}

function initials(name: string) {
  if (!name || name === "UNKNOWN") return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  if (!name || name === "UNKNOWN") return "bg-gray-700";
  const colors = ["bg-blue-700","bg-indigo-700","bg-violet-700","bg-cyan-700","bg-teal-700","bg-sky-700"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}

function statusStyle(status?: string) {
  switch (status) {
    case "Identified":   return { dot: "bg-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "Identified" };
    case "NeedsReview":  return { dot: "bg-amber-400",   badge: "bg-amber-500/20  text-amber-300  border-amber-500/40",  label: "Review"     };
    default:             return { dot: "bg-gray-500",    badge: "bg-gray-700/50   text-gray-300   border-gray-600",      label: "—"          };
  }
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FaceAvatar({ event, size = "w-14 h-14", textSize = "text-base" }: { event: GateEvent; size?: string; textSize?: string }) {
  if (event.faceImageUrl) {
    return (
      <img
        src={apiImageSrc(event.faceImageUrl)}
        alt={event.personName}
        className={`${size} rounded-md object-cover border border-[#1e3254]`}
      />
    );
  }
  if (event.faceImageBase64) {
    return (
      <img
        src={`data:image/jpeg;base64,${event.faceImageBase64}`}
        alt={event.personName}
        className={`${size} rounded-md object-cover border border-[#1e3254]`}
      />
    );
  }
  return (
    <div className={`${size} rounded-md ${avatarColor(event.personName)} flex items-center justify-center ${textSize} font-bold border border-[#1e3254]`}>
      {initials(event.personName)}
    </div>
  );
}

export const CaptureThumb = React.memo(function CaptureThumb({ event }: { event: GateEvent }) {
  const s = statusStyle(event.status);
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative">
        <FaceAvatar event={event} />
        <span className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ${s.dot} border border-black`} />
      </div>
      <span className="text-[10px] text-gray-500 leading-none">{fmtTime(event.timestamp)}</span>
    </div>
  );
}, (prev, next) => prev.event.eventId === next.event.eventId && prev.event.confidence === next.event.confidence);

export const EventCard = React.memo(function EventCard({ event }: { event: GateEvent }) {
  const s = statusStyle(event.status);
  const pct = Math.round(event.confidence * 100);
  return (
    <div className="mx-3 mb-2 rounded-lg border border-[#1a2d4a] bg-[#0b1628] hover:border-[#2a4a7a] transition-colors">
      <div className="flex items-start gap-2 p-2.5 pb-2">
        <div className="w-11 h-11 shrink-0">
          <FaceAvatar event={event} size="w-11 h-11" textSize="text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
            <p className="text-sm font-semibold truncate leading-tight">{event.personName}</p>
          </div>
          <p className="text-[11px] text-gray-500">Camera 01 · {fmtDate(event.timestamp)}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${s.badge}`}>
          {s.label}
        </span>
      </div>
      <div className="px-2.5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#0f1f35] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct >= 85 ? "bg-emerald-400" : pct >= 65 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${pct >= 85 ? "text-emerald-400" : pct >= 65 ? "text-amber-400" : "text-red-400"}`}>
            {pct}%
          </span>
          <span className="text-[10px] text-gray-600">{fmtTime(event.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.event.eventId === next.event.eventId && prev.event.confidence === next.event.confidence);

export function PanelHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#0a1020]">
      <span className="text-blue-400">{icon}</span>
      <span className="text-xs font-semibold tracking-widest uppercase text-gray-300">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5">
          {count}
        </span>
      )}
    </div>
  );
}

export function StatItem({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a2538]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} bg-opacity-15 shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 leading-none mb-0.5">{label}</p>
        <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
      </div>
    </div>
  );
}
