"use client";

import { useState, useEffect, useRef } from "react";
import { type GateEvent } from "@/lib/api";

// ── token resolution ───────────────────────────────────────────
// Priority: ?token= URL param  →  localStorage  →  none (idle-only)
function resolveToken(): string | null {
  if (typeof window === "undefined") return null;
  const urlToken = new URLSearchParams(window.location.search).get("token");
  if (urlToken) {
    localStorage.setItem("gv_token", urlToken);
    return urlToken;
  }
  return localStorage.getItem("gv_token");
}

function openEventStream(
  token: string | null,
  onEvent: (e: GateEvent) => void,
  onOpen: () => void,
  onClose: () => void,
): EventSource {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const url = token
    ? `${base}/api/events/stream?token=${encodeURIComponent(token)}`
    : `${base}/api/events/stream`;
  const es = new EventSource(url);
  es.onopen = onOpen;
  es.onerror = onClose;
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as GateEvent);
    } catch {}
  };
  return es;
}

// ── constants ──────────────────────────────────────────────────
const DISPLAY_MS = 8000;

type Mode = "idle" | "identified" | "review" | "unknown";

function classifyEvent(e: GateEvent): Mode {
  if (!e.personId || e.status === "Unrecognized") return "unknown";
  if (e.status === "Identified") return "identified";
  if (e.status === "NeedsReview") return "review";
  return "unknown";
}

// ── Face image ─────────────────────────────────────────────────
function FacePhoto({ event, size }: { event: GateEvent; size: string }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : (event.faceImageUrl ?? null);

  const initials =
    event.personName && event.personName !== "UNKNOWN"
      ? event.personName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  if (src && !err) {
    return (
      <img
        src={src}
        alt={event.personName}
        onError={() => setErr(true)}
        className={`${size} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-white/10 flex items-center justify-center`}
    >
      <span className="text-5xl font-bold text-white/80">{initials}</span>
    </div>
  );
}

// ── Idle screen ────────────────────────────────────────────────
function IdleScreen({ connected }: { connected: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-between h-full py-16 px-8"
      dir="rtl"
    >
      {/* Brand */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          <svg
            className="w-8 h-8 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-blue-400 text-xs font-semibold tracking-[0.35em] uppercase">
          GateVision
        </p>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center gap-10">
        <div className="text-center">
          <h1
            className="text-8xl font-black leading-tight"
            style={{ color: "#e8edf8", letterSpacing: "normal" }}
          >
            أهلاً وسهلاً
          </h1>
          <p className="text-gray-500 text-xl mt-4 font-light">
            يُرجى الاقتراب من الماسح الضوئي
          </p>
        </div>

        {/* Scan ring */}
        <div className="relative w-48 h-48">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(59,130,246,0.2)",
              animation: "pulse-ring 3s ease-in-out infinite",
            }}
          />
          {/* Middle ring */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              border: "1px solid rgba(59,130,246,0.35)",
              animation: "pulse-ring 3s ease-in-out infinite 0.4s",
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-8 rounded-full"
            style={{
              border: "1px solid rgba(59,130,246,0.5)",
              animation: "pulse-ring 3s ease-in-out infinite 0.8s",
            }}
          />
          {/* Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center"
                style={{ border: "1px solid rgba(59,130,246,0.4)" }}
              >
                <svg
                  className="w-8 h-8 text-blue-400/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-400"
                style={{
                  animation: "ping-slow 2s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3">
        <p
          className="text-5xl font-mono font-bold tabular-nums"
          style={{ color: "#c8d4f0" }}
          suppressHydrationWarning
        >
          {time.toLocaleTimeString("ar-SA", { hour12: false })}
        </p>
        <p className="text-gray-600 text-sm" suppressHydrationWarning>
          {time.toLocaleDateString("ar-SA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div
          className="flex items-center gap-2 mt-2 text-xs"
          style={{ color: connected ? "#4ade80" : "#6b7280" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: connected ? "#4ade80" : "#6b7280" }}
          />
          {connected ? "النظام نشط" : "جارٍ الاتصال…"}
        </div>
      </div>
    </div>
  );
}

// ── Detection screen ───────────────────────────────────────────
const THEMES = {
  identified: {
    bg: "radial-gradient(ellipse at top, #022c22 0%, #07090f 60%)",
    ring: "rgba(52,211,153,0.5)",
    glow: "0 0 120px -20px rgba(52,211,153,0.6)",
    accent: "#4ade80",
    badgeBg: "rgba(52,211,153,0.12)",
    badgeBorder: "rgba(52,211,153,0.3)",
    label: "تم التحقق من الهوية",
    defaultMsg: "نتمنى لك يوماً سعيداً!",
  },
  review: {
    bg: "radial-gradient(ellipse at top, #1c1500 0%, #07090f 60%)",
    ring: "rgba(251,191,36,0.5)",
    glow: "0 0 120px -20px rgba(251,191,36,0.5)",
    accent: "#fbbf24",
    badgeBg: "rgba(251,191,36,0.12)",
    badgeBorder: "rgba(251,191,36,0.3)",
    label: "التحقق مطلوب",
    defaultMsg: "أهلاً بك! يرجى التوجه إلى مكتب الاستقبال لإتمام التحقق.",
  },
  unknown: {
    bg: "radial-gradient(ellipse at top, #1a0505 0%, #07090f 60%)",
    ring: "rgba(248,113,113,0.5)",
    glow: "0 0 120px -20px rgba(248,113,113,0.5)",
    accent: "#f87171",
    badgeBg: "rgba(248,113,113,0.12)",
    badgeBorder: "rgba(248,113,113,0.3)",
    label: "زائر غير معروف",
    defaultMsg: "يرجى التوجه إلى مكتب الاستقبال.",
  },
};

function DetectionScreen({
  event,
  mode,
  progress,
}: {
  event: GateEvent;
  mode: Mode;
  progress: number;
}) {
  const t = THEMES[mode];
  const pct = Math.round(event.confidence * 100);
  const msg =
    mode !== "unknown" ? (event.welcomeMessage ?? t.defaultMsg) : t.defaultMsg;

  return (
    <div
      className="flex flex-col items-center justify-between h-full py-14 px-10 transition-all duration-700"
      style={{ background: t.bg }}
    >
      {/* Status badge */}
      <div
        className="px-5 py-2 rounded-full text-sm font-bold"
        style={{
          color: t.accent,
          background: t.badgeBg,
          border: `1px solid ${t.badgeBorder}`,
          letterSpacing: "normal",
        }}
      >
        {t.label}
      </div>

      {/* Face */}
      <div className="flex flex-col items-center gap-8">
        <div
          className="p-2 rounded-full"
          style={{
            border: `3px solid ${t.ring}`,
            boxShadow: t.glow,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <FacePhoto event={event} size="w-52 h-52" />
        </div>

        {/* Name & message */}
        <div className="text-center space-y-3 max-w-sm" dir="rtl">
          {mode !== "unknown" ? (
            <>
              <p className="text-gray-500 text-lg font-light">
                {mode === "identified" ? "مرحباً بعودتك،" : "مرحباً،"}
              </p>
              <h2
                className="text-5xl font-black leading-tight"
                style={{ color: "#e8edf8", letterSpacing: "normal" }}
              >
                {event.personName}
              </h2>
              {event.department && (
                <span
                  className="inline-block text-sm px-4 py-1.5 rounded-full font-medium"
                  style={{
                    color: t.accent,
                    background: t.badgeBg,
                    border: `1px solid ${t.badgeBorder}`,
                  }}
                >
                  {event.department}
                </span>
              )}
            </>
          ) : (
            <h2 className="text-4xl font-black" style={{ color: t.accent }}>
              {/* //  وصول مقيّد */}
            </h2>
          )}
          <p className="text-gray-300 text-3xl font-medium pt-3 leading-relaxed">
            {msg}
          </p>
        </div>

        {/* Confidence */}
        {mode !== "unknown" && (
          <div className="w-56">
            <div
              className="flex justify-between text-xs mb-1.5"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <span>نسبة التطابق</span>
              <span style={{ color: t.accent }} className="font-bold">
                {pct}%
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: t.accent,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dismiss timer */}
      <div className="w-full max-w-xs">
        <div
          className="h-px rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: "rgba(255,255,255,0.18)",
              transition: "width 120ms linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function KioskPage() {
  const [event, setEvent] = useState<GateEvent | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
  };

  const showEvent = (e: GateEvent) => {
    const m = classifyEvent(e);
    setEvent(e);
    setMode(m);
    setProgress(1);
    clearTimers();

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const ratio = Math.max(0, 1 - (Date.now() - start) / DISPLAY_MS);
      setProgress(ratio);
    }, 120);

    dismissRef.current = setTimeout(() => {
      clearTimers();
      setEvent(null);
      setMode("idle");
    }, DISPLAY_MS);
  };

  useEffect(() => {
    const token = resolveToken();
    const es = openEventStream(
      token,
      showEvent,
      () => setConnected(true),
      () => setConnected(false),
    );
    return () => {
      es.close();
      clearTimers();
    };
  }, []);

  const showing = event !== null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;600;700;800;900&display=swap');
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Full-screen kiosk shell – covers NavBar via fixed + z-index */}
      <div
        className="fixed inset-0 z-[9999] overflow-hidden"
        style={{
          background: "#07090f",
          fontFamily: "'Cairo', system-ui, sans-serif",
        }}
      >
        {/* Idle layer */}
        <div
          className="absolute inset-0"
          style={{
            opacity: showing ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: showing ? "none" : "auto",
          }}
        >
          <IdleScreen connected={connected} />
        </div>

        {/* Detection layer */}
        <div
          className="absolute inset-0"
          style={{
            opacity: showing ? 1 : 0,
            transition: "opacity 0.6s ease",
            pointerEvents: showing ? "auto" : "none",
          }}
        >
          {event && (
            <DetectionScreen event={event} mode={mode} progress={progress} />
          )}
        </div>
      </div>
    </>
  );
}
