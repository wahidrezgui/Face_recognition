"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchPersonIds,
  activityRangeBounds,
  type GateEvent,
} from "@/lib/api";
import { useGateEventStream } from "@/hooks/useGateEventStream";
import {
  dedupeCapturesByPerson,
  isEventFromToday,
  sortGateEventsByDetectionDesc,
} from "@/lib/datetime";

export function useDashboardEvents(selectedGate?: string) {
  const [liveEvents, setLiveEvents] = useState<GateEvent[]>([]);
  const [streamError, setStreamError] = useState(false);

  const todayBounds = useMemo(() => activityRangeBounds("today"), []);

  const { data: initialData, refetch: refetchEvents } = useQuery({
    queryKey: ["events", "dashboard", "today"],
    queryFn: () =>
      fetchEvents(1, 30, undefined, undefined, todayBounds.from, todayBounds.to),
  });

  const { data: employeeIds = new Set<string>() } = useQuery({
    queryKey: ["personIds"],
    queryFn: async () => new Set(await fetchPersonIds()),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setStreamError(false);
  }, [selectedGate]);

  useEffect(() => {
    if (initialData?.items) setLiveEvents(sortGateEventsByDetectionDesc(initialData.items));
  }, [initialData]);

  const handleStreamEvent = useCallback((e: GateEvent) => {
    setLiveEvents((prev) => {
      const exactIdx = prev.findIndex((p) => p.eventId === e.eventId);
      if (exactIdx !== -1) {
        const updated = [...prev];
        updated[exactIdx] = e;
        return sortGateEventsByDetectionDesc(updated);
      }
      if (e.personId) {
        const newTime = new Date(e.timestamp).getTime();
        const dupIdx = prev.findIndex(
          (p) => p.personId === e.personId && newTime - new Date(p.timestamp).getTime() <= 5000,
        );
        if (dupIdx !== -1) {
          if (e.confidence > prev[dupIdx].confidence) {
            const updated = [...prev];
            updated[dupIdx] = e;
            return sortGateEventsByDetectionDesc(updated);
          }
          return prev;
        }
      }
      return sortGateEventsByDetectionDesc([e, ...prev]).slice(0, 100);
    });
  }, []);

  useGateEventStream({
    gateId: selectedGate,
    filter: (e) => isEventFromToday(e.timestamp),
    onEvent: handleStreamEvent,
    onOpen: () => setStreamError(false),
    onError: () => setStreamError(true),
  });

  const todayEvents = useMemo(
    () => sortGateEventsByDetectionDesc(liveEvents.filter((e) => isEventFromToday(e.timestamp))),
    [liveEvents],
  );

  const matchedEvents = useMemo(
    () => todayEvents.filter((e) => e.personId && employeeIds.has(e.personId)),
    [todayEvents, employeeIds],
  );

  const recentCaptures = useMemo(
    () => dedupeCapturesByPerson(todayEvents).slice(0, 6),
    [todayEvents],
  );

  const clearCaptures = useCallback(() => setLiveEvents([]), []);

  return {
    todayEvents,
    matchedEvents,
    recentCaptures,
    streamError,
    setStreamError,
    refetchEvents,
    clearCaptures,
  };
}
