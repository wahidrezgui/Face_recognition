"use client";

import { LiveClock } from "@/components/LiveClock";
import { IconDot } from "@/components/icons";

export function DashboardHeader() {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gv-border bg-[#090e1c] px-4 py-2 sm:gap-4 sm:px-5">
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <IconDot online />
        <span>System Online</span>
      </div>
      <div className="ml-4 flex items-center gap-1.5 text-xs text-gray-400">
        <IconDot online />
        <span>AI Service</span>
      </div>
      <div className="ml-auto flex items-center gap-3 font-mono text-xs text-gray-500">
        <LiveClock
          mode="datetime"
          options={{
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour12: false,
          }}
          className="text-blue-300 text-sm font-bold"
        />
      </div>
    </header>
  );
}
