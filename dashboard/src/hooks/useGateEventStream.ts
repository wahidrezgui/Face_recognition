"use client";

import { useEffect, useRef, useState } from "react";
import { type GateEvent } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const MAX_BACKOFF_MS = 30_000;

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

function normalizeGateId(gateId?: string): string | undefined {
  const trimmed = gateId?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

export function buildEventStreamUrl(token: string | null, gateId?: string): string {
  const params = new URLSearchParams();
  const normalized = normalizeGateId(gateId);
  if (normalized) params.set("gateId", normalized);
  if (token) params.set("token", token);
  const qs = params.toString();
  return qs ? `${API_BASE}/api/v1/events/stream?${qs}` : `${API_BASE}/api/v1/events/stream`;
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

export type GateEventStreamState = {
  connected: boolean;
  lastEventAt: number | null;
};

export function useGateEventStream({
  enabled = true,
  gateId,
  filter,
  onEvent,
  onOpen,
  onError,
  resolveToken: resolveTokenFn,
}: GateEventStreamOptions): GateEventStreamState {
  const onEventRef = useRef(onEvent);
  const onOpenRef = useRef(onOpen);
  const onErrorRef = useRef(onError);
  const filterRef = useRef(filter);
  const resolveTokenRef = useRef(resolveTokenFn);
  const gateIdRef = useRef(gateId);

  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

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

  const connectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let backoffMs = 1_000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const cleanup = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      setConnected(false);
      onErrorRef.current?.();
      cleanup();
      reconnectTimer = setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        connect();
      }, backoffMs);
    };

    const connect = () => {
      if (disposed) return;
      cleanup();
      const tokenResolver = resolveTokenRef.current ?? resolveStreamToken;
      es = openEventStream(
        (e) => {
          if (filterRef.current && !filterRef.current(e)) return;
          setLastEventAt(Date.now());
          onEventRef.current(e);
        },
        () => {
          backoffMs = 1_000;
          setConnected(true);
          onOpenRef.current?.();
        },
        scheduleReconnect,
        tokenResolver(),
        gateIdRef.current,
      );
    };

    connectRef.current = connect;
    connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !disposed) {
        backoffMs = 1_000;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      connectRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      cleanup();
      setConnected(false);
    };
  }, [enabled, gateId]);

  return { connected, lastEventAt };
}
