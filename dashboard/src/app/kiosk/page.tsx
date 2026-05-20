"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type GateEvent } from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import { FacePhoto } from "@/components/kiosk/FacePhoto";
import { IdleScreen } from "@/components/kiosk/IdleScreen";

// ── constants ──────────────────────────────────────────────────
const DISPLAY_MS = 8000;

type Mode = "idle" | "identified" | "review";

function classifyEvent(e: GateEvent): Mode {
  if (e.status === "Identified") return "identified";
  if (e.status === "NeedsReview") return "review";
  return "idle";
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
  idle: {
    bg: "radial-gradient(ellipse at top, #0a1628 0%, #07090f 60%)",
    ring: "rgba(100,116,139,0.3)",
    glow: "none",
    accent: "#94a3b8",
    badgeBg: "rgba(100,116,139,0.1)",
    badgeBorder: "rgba(100,116,139,0.15)",
    label: "بانتظار التعرف",
    defaultMsg: "",
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
    mode !== "idle" ? (event.welcomeMessage ?? t.defaultMsg) : t.defaultMsg;

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
          {mode !== "idle" ? (
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
        {mode !== "idle" && (
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

  const showEvent = useCallback((e: GateEvent) => {
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
  }, []);

  useGateEventStream({
    onEvent: showEvent,
    onOpen: () => setConnected(true),
    onError: () => setConnected(false),
  });

  useEffect(() => () => clearTimers(), []);

  const showing = event !== null;

  return (
    <>
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
