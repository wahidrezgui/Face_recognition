"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEvents, fetchValidatedEvents, type GateEvent } from "@/lib/api";
import { useDeskLiveEventStream } from "@/hooks/useDeskLiveEventStream";
import {
  mergeDeskLiveEvent,
  normalizeGateId,
  seedEventsFromRest,
} from "@/lib/deskLiveEvents";

/**
 * Target Analysis — desk-aligned live feed.
 * REST seeds recent gate + validated events; SSE appends live updates (fan-out per subscriber).
 */
export function useDashboardEvents(sseGateId?: string) {
  const gateId = normalizeGateId(sseGateId);
  const [liveEvents, setLiveEvents] = useState<GateEvent[]>([]);

  useEffect(() => {
    setLiveEvents([]);
  }, [gateId]);

  const handleEvent = useCallback((e: GateEvent) => {
    setLiveEvents((prev) => mergeDeskLiveEvent(prev, e));
  }, []);

  const { connected, lastEventAt, sseError, deskLookbackMs, showNeedsReview } =
    useDeskLiveEventStream(gateId, handleEvent, { applyLookback: false });

  useEffect(() => {
    if (!gateId) return;

    let cancelled = false;

    const seedFromRest = async () => {
      const from = new Date(Date.now() - deskLookbackMs).toISOString();
      try {
        const [gateRes, validatedRes] = await Promise.all([
          fetchEvents(1, 50, undefined, undefined, from, undefined, gateId),
          fetchValidatedEvents(1, 50, undefined, from, undefined, gateId),
        ]);
        if (cancelled) return;

        const seeded = seedEventsFromRest(gateRes.items, validatedRes.items, showNeedsReview);
        setLiveEvents((prev) => {
          let merged = prev;
          for (const e of seeded) merged = mergeDeskLiveEvent(merged, e);
          return merged;
        });
      } catch {
        /* non-fatal — live SSE still works */
      }
    };

    void seedFromRest();
    return () => {
      cancelled = true;
    };
  }, [gateId, deskLookbackMs, showNeedsReview]);

  return {
    liveEvents,
    sseConnected: connected,
    sseError,
    lastEventAt,
    needsGate: !gateId,
  };
}
