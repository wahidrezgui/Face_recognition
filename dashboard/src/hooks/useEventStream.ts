"use client";

import { useEffect, useRef, useCallback } from "react";
import { type GateEvent } from "@/lib/api";

// ── Token resolution ──────────────────────────────────────────
// Priority: ?token= URL param  →  localStorage  →  none
export function resolveToken(): string | null {
  if (typeof window === "undefined") return null;
  const urlToken = new URLSearchParams(window.location.search).get("token");
  if (urlToken) {
    localStorage.setItem("gv_token", urlToken);
    return urlToken;
  }
  return localStorage.getItem("gv_token");
}

// ── SSE event stream ──────────────────────────────────────────
export function openEventStream(
  onEvent: (e: GateEvent) => void,
  onOpen?: () => void,
  onClose?: () => void,
  token?: string | null,
): EventSource {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const tk = token ?? resolveToken();
  const url = tk
    ? `${base}/api/events/stream?token=${encodeURIComponent(tk)}`
    : `${base}/api/events/stream`;
  const es = new EventSource(url);
  if (onOpen) es.onopen = onOpen;
  if (onClose) es.onerror = onClose;
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as GateEvent);
    } catch { /* skip malformed */ }
  };
  return es;
}

// ── Hook ──────────────────────────────────────────────────────
export function useEventStream(
  onEvent: (e: GateEvent) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  const onEventRef = useRef(onEvent);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Keep refs in sync without re-creating the effect
  useEffect(() => { onEventRef.current = onEvent; },   [onEvent]);
  useEffect(() => { onOpenRef.current  = onOpen;  },   [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; },   [onClose]);

  useEffect(() => {
    const es = openEventStream(
      (e) => onEventRef.current(e),
      () => onOpenRef.current?.(),
      () => onCloseRef.current?.(),
    );
    return () => es.close();
  }, []);
}
