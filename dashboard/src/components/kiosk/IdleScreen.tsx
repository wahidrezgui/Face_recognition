"use client";

import { useState, useEffect } from "react";

export function IdleScreen({
  connected,
  showBrand = true,
}: {
  connected: boolean;
  showBrand?: boolean;
}) {
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
        {showBrand && (
          <>
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
          </>
        )}
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
