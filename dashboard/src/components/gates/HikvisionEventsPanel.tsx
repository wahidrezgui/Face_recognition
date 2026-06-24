"use client";

import { useEffect, useState } from "react";
import { fetchGateCameraEvents, type GateCameraEvents } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

interface HikvisionEventsPanelProps {
  gateId: string;
  gateOnline: boolean;
}

export function HikvisionEventsPanel({ gateId, gateOnline }: HikvisionEventsPanelProps) {
  const [cameraEvents, setCameraEvents] = useState<GateCameraEvents | null>(null);

  useEffect(() => {
    if (!gateOnline) return;
    let active = true;
    const poll = async () => {
      const data = await fetchGateCameraEvents(gateId);
      if (active) setCameraEvents(data);
    };
    poll();
    const iv = setInterval(poll, 3_000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [gateId, gateOnline]);

  if (!gateOnline) return null;

  return (
    <>
      <section>
        <h2 className="mb-1 text-sm font-bold tracking-wide">Camera Events</h2>
        <p className="mb-4 text-xs text-gv-muted">
          Live ISAPI events received from the Hikvision camera — shows what triggers face detection.
        </p>

        {!cameraEvents ? (
          <p className="text-xs text-gray-600">Loading…</p>
        ) : !cameraEvents.enabled ? (
          <div className="rounded border border-[#1a2640] bg-[#0d1a2f] px-4 py-3 text-xs text-gray-500">
            Hikvision integration not configured. Set{" "}
            <span className="font-mono text-gray-400">GV_HIKVISION_URL</span> (e.g.{" "}
            <span className="font-mono text-gray-400">http://192.168.1.64</span>) on the Python service.
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${cameraEvents.connected ? "bg-emerald-400" : "bg-red-500"}`}
                />
                <span className="text-gray-400">{cameraEvents.connected ? "Connected" : "Disconnected"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${cameraEvents.active ? "animate-pulse bg-blue-400" : "bg-gray-600"}`}
                />
                <span className="text-gray-400">{cameraEvents.active ? "Gate active" : "Idle"}</span>
              </div>
              {cameraEvents.url && (
                <span className="truncate text-gray-600" title={cameraEvents.url}>
                  {cameraEvents.url}/ISAPI/Event/…
                </span>
              )}
              <span className="text-gray-600">ttl: {cameraEvents.event_ttl_ms}ms</span>
              <span className="text-gray-600">filter: {cameraEvents.event_types}</span>
            </div>

            {cameraEvents.events.length === 0 ? (
              <p className="text-xs text-gray-600">No events received yet.</p>
            ) : (
              <div className="max-h-64 space-y-px overflow-y-auto rounded border border-[#1a2640]">
                {cameraEvents.events.map((ev, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-1.5 text-[11px] ${ev.qualified ? "bg-emerald-950/30" : "bg-[#0d1a2f]"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ev.qualified ? "bg-emerald-400" : "bg-gray-600"}`}
                    />
                    <span className="w-32 flex-shrink-0 font-mono text-gray-200">{ev.eventType || "—"}</span>
                    <span
                      className={`w-16 flex-shrink-0 ${ev.eventState === "active" ? "text-blue-400" : "text-gray-500"}`}
                    >
                      {ev.eventState}
                    </span>
                    <span className="flex-shrink-0 text-gray-500">ch {ev.channelId}</span>
                    {ev.detectionTarget && <span className="text-gray-500">{ev.detectionTarget}</span>}
                    {ev.reason && (
                      <span className="truncate text-gray-600" title={ev.reason}>
                        {ev.reason}
                      </span>
                    )}
                    <span className="ml-auto flex-shrink-0 text-gray-600">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <Separator className="bg-gv-border" />
    </>
  );
}
