"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GateStatus } from "@/lib/api";
import { normalizeGateId, pickDefaultSseGate } from "@/lib/deskLiveEvents";

/**
 * Stream focus (MJPEG) and SSE gate (Target Analysis) are independent:
 * "All Gates" clears stream focus but keeps the live event feed running.
 */
export function useDashboardGateSelection(gates: GateStatus[]) {
  const [streamGateId, setStreamGateId] = useState<string | undefined>();
  const [sseGateId, setSseGateId] = useState<string | undefined>();
  const didAutoSelectSseGate = useRef(false);

  useEffect(() => {
    if (didAutoSelectSseGate.current || sseGateId || gates.length === 0) return;
    const defaultGate = pickDefaultSseGate(gates);
    if (defaultGate) {
      setSseGateId(defaultGate);
      didAutoSelectSseGate.current = true;
    }
  }, [gates, sseGateId]);

  const focusGate = useCallback((id: string) => {
    const gateId = normalizeGateId(id);
    setStreamGateId(gateId);
    setSseGateId(gateId);
  }, []);

  const selectSseGate = useCallback((id: string | undefined) => {
    setSseGateId(id ? normalizeGateId(id) : undefined);
  }, []);

  const backToAllGates = useCallback(() => {
    setStreamGateId(undefined);
  }, []);

  return {
    streamGateId,
    sseGateId,
    focusGate,
    selectSseGate,
    backToAllGates,
  };
}
