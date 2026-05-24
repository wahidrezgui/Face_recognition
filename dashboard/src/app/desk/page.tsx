"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type GateEvent } from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import { FacePhoto } from "@/components/kiosk/FacePhoto";
import { IdleScreen } from "@/components/kiosk/IdleScreen";
import wellWishes from "@/data/well-wishes.json";

const DISPLAY_MS = 10000;
const REPEAT_HISTORY_SIZE = 4;

const categoryMap: Record<string, string[]> = {
  identified: ["encouragement", "success"],
  review: ["encouragement", "wellness"],
};

function pickWish(mode: string, history: string[]): { wish: string; id: string } {
  const preferredCats = categoryMap[mode] ?? ["encouragement"];
  const preferred = wellWishes.filter(
    (w) => preferredCats.includes(w.category) && !history.includes(w.id),
  );
  if (preferred.length > 0) {
    const chosen = preferred[Math.floor(Math.random() * preferred.length)];
    return { wish: chosen.text, id: chosen.id };
  }
  const fallback = wellWishes.filter((w) => !history.includes(w.id));
  if (fallback.length > 0) {
    const chosen = fallback[Math.floor(Math.random() * fallback.length)];
    return { wish: chosen.text, id: chosen.id };
  }
  const chosen = wellWishes[Math.floor(Math.random() * wellWishes.length)];
  return { wish: chosen.text, id: chosen.id };
}

type Mode = "idle" | "identified" | "review";

function classifyEvent(e: GateEvent): Mode {
  if (e.status === "Identified") return "identified";
  return "review";
}

const THEMES = {
  identified: {
    ring: "border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.4)]",
    ringAnim: "pulse-glow-ring-cyan 4s ease-in-out infinite",
    glow: "bg-cyan-500",
    badge: "border-cyan-500/30 bg-cyan-900/30 text-cyan-300",
    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]",
    name: "text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]",
  },
  review: {
    ring: "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]",
    ringAnim: "pulse-glow-ring-amber 4s ease-in-out infinite",
    glow: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-900/30 text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    name: "text-white drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]",
  },
};

// FacePhoto and IdleScreen are imported from @/components/kiosk/

export default function DeskPage() {
  const [event, setEvent] = useState<GateEvent | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [connected, setConnected] = useState(false);
  const [time, setTime] = useState(new Date());
  const [progress, setProgress] = useState(1);
  const [visible, setVisible] = useState(false);
  const [wishText, setWishText] = useState("");
  const wishHistory = useRef<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEventIdRef = useRef<string | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
  };

  const showEvent = useCallback((e: GateEvent) => {
    const m = classifyEvent(e);
    activeEventIdRef.current = e.eventId;
    setEvent(e);
    setMode(m);
    setProgress(1);
    setVisible(true);
    clearTimers();

    const { wish, id } = pickWish(m, wishHistory.current);
    setWishText(wish);
    wishHistory.current = [id, ...wishHistory.current].slice(0, REPEAT_HISTORY_SIZE);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const ratio = Math.max(0, 1 - (Date.now() - start) / DISPLAY_MS);
      setProgress(ratio);
    }, 100);

    dismissRef.current = setTimeout(() => {
      clearTimers();
      activeEventIdRef.current = null;
      setVisible(false);
      setTimeout(() => {
        setEvent(null);
        setMode("idle");
      }, 600);
    }, DISPLAY_MS);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useGateEventStream({
    onEvent: (e) => {
      if (activeEventIdRef.current === e.eventId) {
        setEvent((prev) => (prev && e.confidence > prev.confidence) ? e : prev);
      } else {
        showEvent(e);
      }
    },
    onOpen: () => setConnected(true),
    onError: () => setConnected(false),
  });

  useEffect(() => () => clearTimers(), []);

  const showing = event !== null && visible;
  const t = mode !== "idle" ? THEMES[mode] : THEMES.identified;

  const greeting =
    mode === "identified"
      ? (event?.welcomeMessage ?? "أهلاً بك!")
      : mode === "review"
        ? (event?.welcomeMessage ?? "    ")
        : "أهلاً وسهلاً";

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] overflow-hidden"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif", background: "#020617" }}
        dir="rtl"
      >
        {/* ── Grid background ─────────────────────────────── */}
        <div
          className="absolute inset-0 z-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "pan-grid 20s linear infinite",
          }}
        />
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, #020617 90%)",
          }}
        />

        {/* ── Idle layer ──────────────────────────────────── */}
        <div
          className="absolute inset-0"
          style={{
            opacity: showing ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: showing ? "none" : "auto",
          }}
        >
          <IdleScreen connected={connected} showBrand={false} />
        </div>

        {/* ── Detection layer ─────────────────────────────── */}
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          style={{
            opacity: showing ? 1 : 0,
            transition: "opacity 0.6s ease",
            pointerEvents: showing ? "auto" : "none",
          }}
        >
          {event && (
            <div className="flex flex-col items-center justify-center w-full h-full px-8">
              {/* Halo + Avatar */}
              <div
                className="relative flex items-center justify-center mb-10"
                style={{ animation: "fade-in-scale 0.8s ease-out forwards" }}
              >
                <div
                  className={`absolute w-[420px] h-[420px] rounded-full opacity-20 blur-[40px] ${t.glow}`}
                  style={{ animation: "halo-pulse 4s ease-in-out infinite" }}
                />
                <div
                  className={`absolute w-[340px] h-[340px] rounded-full border-[3px] ${t.ring}`}
                  style={{ animation: t.ringAnim }}
                />
                <div className="w-[320px] h-[320px] rounded-full overflow-hidden border-4 border-[#020617] relative z-10 shadow-2xl">
                  <FacePhoto event={event} size="w-full h-full" />
                </div>
              </div>

              {/* Greeting (hero text, replaces name) */}
              <h2
                className="text-5xl md:text-6xl font-black text-center leading-tight text-white px-4"
                style={{
                  animation: "fade-in-up 1s ease-out 0.2s both",
                  textShadow:
                    mode === "identified"
                      ? "0 0 20px rgba(0,255,255,0.4)"
                      : mode === "review"
                        ? "0 0 20px rgba(251,191,36,0.4)"
                        : "0 0 20px rgba(248,113,113,0.4)",
                }}
              >
                {greeting}
              </h2>

              {/* Department badge */}
              {event.department && (
                <div
                  className={`inline-flex items-center gap-3 px-6 py-3 mt-6 rounded-full border backdrop-blur-sm ${t.badge}`}
                  style={{ animation: "slide-up 0.8s ease-out 0.4s both" }}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${t.dot} animate-pulse`} />
                  <span className="text-lg md:text-xl tracking-widest font-medium">{event.department}</span>
                </div>
              )}

              {/* Warm message */}
              {wishText && (
                <p
                  className="mt-10 text-xl md:text-2xl text-center leading-relaxed max-w-lg text-gray-300/80"
                  style={{ animation: "fade-in-up 0.8s ease-out 0.5s both" }}
                >
                  {wishText}
                </p>
              )}

              {/* Dismiss timer bar */}
              <div
                className="absolute bottom-10 w-48 h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: "rgba(255,255,255,0.15)",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
