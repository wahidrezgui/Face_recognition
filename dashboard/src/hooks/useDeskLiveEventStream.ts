"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchGateDeskConfig, type GateEvent } from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import {
  DEFAULT_DESK_LOOKBACK_MS,
  isWithinDeskLookback,
  normalizeGateId,
  shouldShowOnDesk,
} from "@/lib/deskLiveEvents";

export type DeskLiveStreamOptions = {
  /** When true (default), ignore events outside the desk lookback window — used by /desk. */
  applyLookback?: boolean;
};

/**
 * Shared live SSE + desk filter contract used by /desk and dashboard Target Analysis.
 * Uses React state for lookback/review flags so the stream filter updates when config loads.
 */
export function useDeskLiveEventStream(
  gateId: string | undefined,
  onEvent: (e: GateEvent) => void,
  options: DeskLiveStreamOptions = {},
) {
  const applyLookback = options.applyLookback ?? true;
  const normalized = normalizeGateId(gateId);
  const pageLoadedAt = useRef(Date.now());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const [deskLookbackMs, setDeskLookbackMs] = useState(DEFAULT_DESK_LOOKBACK_MS);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [sseError, setSseError] = useState(false);

  useEffect(() => {
    pageLoadedAt.current = Date.now();
    setDeskLookbackMs(DEFAULT_DESK_LOOKBACK_MS);
    setShowNeedsReview(false);
    setSseError(false);

    if (!normalized) return;

    fetchGateDeskConfig(normalized).then((cfg) => {
      setDeskLookbackMs(cfg.desk_event_lookback_seconds * 1000);
      setShowNeedsReview(cfg.show_needs_review_on_desk);
    });
  }, [normalized]);

  const filter = useCallback(
    (e: GateEvent) => {
      if (!shouldShowOnDesk(e, showNeedsReview)) return false;
      if (!applyLookback) return true;
      return isWithinDeskLookback(e.timestamp, pageLoadedAt.current, deskLookbackMs);
    },
    [showNeedsReview, deskLookbackMs, applyLookback],
  );

  const handleEvent = useCallback((e: GateEvent) => {
    onEventRef.current(e);
  }, []);

  const { connected, lastEventAt } = useGateEventStream({
    enabled: !!normalized,
    gateId: normalized,
    filter,
    onEvent: handleEvent,
    onOpen: () => setSseError(false),
    onError: () => setSseError(true),
  });

  return {
    gateId: normalized,
    connected: !!normalized && connected,
    lastEventAt,
    sseError,
    showNeedsReview,
    deskLookbackMs,
  };
}
