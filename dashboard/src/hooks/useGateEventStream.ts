"use client";

import { useEffect, useRef } from "react";
import { type GateEvent } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/** URL ?token= → localStorage (kiosk/desk wall displays). */
export function resolveStreamToken(): string | null {
  if (typeof window === "undefined") return null;
  const urlToken = new URLSearchParams(window.location.search).get("token");
  if (urlToken) {
    localStorage.setItem("gv_token", urlToken);
    return urlToken;
  }
  return getToken();
}

export function buildEventStreamUrl(token: string | null, gateId?: string): string {
  const params = new URLSearchParams();
  if (gateId) params.set("gateId", gateId);
  if (token) params.set("token", token);
  const qs = params.toString();
  return qs
    ? `${API_BASE}/api/events/stream?${qs}`
    : `${API_BASE}/api/events/stream`;
}

export type GateEventStreamOptions = {
  enabled?: boolean;
  gateId?: string;
  filter?: (e: GateEvent) => boolean;
  onEvent: (e: GateEvent) => void;
  onOpen?: () => void;
  onError?: () => void;
  resolveToken?: () => string | null;
};

export function openEventStream(
  onEvent: (e: GateEvent) => void,
  onOpen?: () => void,
  onError?: () => void,
  token?: string | null,
  gateId?: string,
): EventSource {
  const tk = token ?? resolveStreamToken();
  const es = new EventSource(buildEventStreamUrl(tk, gateId));
  if (onOpen) es.onopen = onOpen;
  if (onError) es.onerror = onError;
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as GateEvent);
    } catch {
      /* skip malformed */
    }
  };
  return es;
}

export function useGateEventStream({
  enabled = true,
  gateId,
  filter,
  onEvent,
  onOpen,
  onError,
  resolveToken: resolveTokenFn,
}: GateEventStreamOptions): void {
  const onEventRef = useRef(onEvent);
  const onOpenRef = useRef(onOpen);
  const onErrorRef = useRef(onError);
  const filterRef = useRef(filter);
  const resolveTokenRef = useRef(resolveTokenFn);
  const gateIdRef = useRef(gateId);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  useEffect(() => {
    resolveTokenRef.current = resolveTokenFn;
  }, [resolveTokenFn]);
  useEffect(() => {
    gateIdRef.current = gateId;
  }, [gateId]);

  useEffect(() => {
    if (!enabled) return;

    const tokenResolver = resolveTokenRef.current ?? resolveStreamToken;
    const es = openEventStream(
      (e) => {
        if (filterRef.current && !filterRef.current(e)) return;
        onEventRef.current(e);
      },
      () => onOpenRef.current?.(),
      () => onErrorRef.current?.(),
      tokenResolver(),
      gateIdRef.current,
    );

    return () => es.close();
  }, [enabled, gateId]);
}
