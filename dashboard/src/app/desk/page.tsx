"use client";

import { useState, useEffect, useRef } from "react";
import { type GateEvent } from "@/lib/api";
import wellWishes from "@/data/well-wishes.json";

const DISPLAY_MS = 10000;
const REPEAT_HISTORY_SIZE = 4;

const categoryMap: Record<string, string[]> = {
  identified: ["encouragement", "success"],
  review: ["encouragement"],
  unknown: ["wellness"],
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

type Mode = "idle" | "identified" | "review" | "unknown";

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

function classifyEvent(e: GateEvent): Mode {
  if (!e.personId || e.status === "Unrecognized") return "unknown";
  if (e.status === "Identified") return "identified";
  if (e.status === "NeedsReview") return "review";
  return "unknown";
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
  unknown: {
    ring: "border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.4)]",
    ringAnim: "pulse-glow-ring-red 4s ease-in-out infinite",
    glow: "bg-red-500",
    badge: "border-red-500/30 bg-red-900/30 text-red-300",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
    name: "text-white drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]",
  },
};

function FacePhoto({ event, size }: { event: GateEvent; size: string }) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : (event.faceImageUrl ?? null);

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
    <div className={`${size} rounded-full bg-[#1a2b3c] flex items-center justify-center`}>
      <svg className="w-24 h-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    </div>
  );
}

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

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
  };

  const showEvent = (e: GateEvent) => {
    const m = classifyEvent(e);
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
      setVisible(false);
      setTimeout(() => {
        setEvent(null);
        setMode("idle");
      }, 600);
    }, DISPLAY_MS);
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  const showing = event !== null && visible;
  const t = mode !== "idle" ? THEMES[mode] : THEMES.identified;

  const greeting =
    mode === "identified"
      ? (event?.welcomeMessage ?? "أهلاً بك!")
      : mode === "review"
        ? (event?.welcomeMessage ?? "يرجى التوجّه إلى مكتب الاستقبال")
        : "أهلاً وسهلاً";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;600;700;800;900&display=swap');

        @keyframes pan-grid {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        @keyframes halo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.12); opacity: 0.4; }
        }
        @keyframes ring-pulse-cyan {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(0,255,255,0.3); }
          50% { transform: scale(1.04); box-shadow: 0 0 50px rgba(0,255,255,0.7); }
        }
        @keyframes ring-pulse-amber {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(251,191,36,0.3); }
          50% { transform: scale(1.04); box-shadow: 0 0 50px rgba(251,191,36,0.7); }
        }
        @keyframes ring-pulse-red {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(248,113,113,0.3); }
          50% { transform: scale(1.04); box-shadow: 0 0 50px rgba(248,113,113,0.7); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-scale {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8"
          style={{
            opacity: showing ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: showing ? "none" : "auto",
          }}
        >
          <h1
            className="text-8xl font-black leading-tight"
            style={{ color: "#e8edf8", letterSpacing: "normal" }}
          >
            أهلاً وسهلاً
          </h1>
          <div className="flex flex-col items-center gap-8">

            {/* Pulsing rings */}
            <div className="relative w-56 h-56">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px solid rgba(59,130,246,0.15)",
                  animation: "halo-pulse 3s ease-in-out infinite",
                }}
              />
              <div
                className="absolute inset-5 rounded-full"
                style={{
                  border: "1px solid rgba(59,130,246,0.25)",
                  animation: "halo-pulse 3s ease-in-out infinite 0.6s",
                }}
              />
              <div
                className="absolute inset-10 rounded-full"
                style={{
                  border: "1px solid rgba(59,130,246,0.4)",
                  animation: "halo-pulse 3s ease-in-out infinite 1.2s",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center border border-blue-400/30">
                  <svg className="w-10 h-10 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              </div>
            </div>

            

            <p
              className="text-6xl font-bold tabular-nums text-gray-600"
              suppressHydrationWarning
              style={{ letterSpacing: "0.05em" }}
            >
              {time.toLocaleTimeString("ar-SA", { hour12: false })}
            </p>
          </div>

          <div className="absolute bottom-10 flex items-center gap-2.5 text-sm" style={{ color: connected ? "#4ade80" : "#6b7280" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: connected ? "#4ade80" : "#6b7280" }} />
            {connected ? "النظام نشط" : "جارٍ الاتصال…"}
          </div>
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
