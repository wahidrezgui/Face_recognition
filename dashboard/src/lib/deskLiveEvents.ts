import type { GateEvent, GateStatus, ValidatedEvent } from "@/lib/api";
import { sortGateEventsByDetectionDesc } from "@/lib/datetime";

export const DEFAULT_DESK_LOOKBACK_MS = 30_000;

export function normalizeGateId(gateId?: string): string | undefined {
  const trimmed = gateId?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

/** Prefer the gate that is actually streaming (matches desk / live AI). */
export function pickDefaultSseGate(gates: GateStatus[]): string | undefined {
  const live = gates.find((g) => g.online && (g.status?.camera_open ?? false));
  if (live) return normalizeGateId(live.id);
  if (gates[0]) return normalizeGateId(gates[0].id);
  return undefined;
}

/** Map access-log validated row into the live GateEvent shape for Target Analysis seeding. */
export function validatedEventToGateEvent(v: ValidatedEvent): GateEvent {
  return {
    eventId: v.gateEventId ?? v.eventId,
    gateId: v.gateId,
    personId: v.personId,
    personName: v.personName,
    confidence: v.confidence,
    timestamp: v.timestamp,
    status: "Identified",
    faceImageBase64: v.faceImageBase64,
    department: v.department,
    emotion: v.emotion,
    age: v.age,
    gender: v.gender,
  };
}

/** Merge REST seed rows (gate + validated tables) using the same desk visibility rules. */
export function seedEventsFromRest(
  gateItems: GateEvent[],
  validatedItems: ValidatedEvent[],
  showNeedsReview: boolean,
  limit = 50,
): GateEvent[] {
  let merged: GateEvent[] = [];
  for (const e of gateItems) {
    if (shouldShowOnDesk(e, showNeedsReview)) merged = mergeDeskLiveEvent(merged, e, limit);
  }
  for (const v of validatedItems) {
    const e = validatedEventToGateEvent(v);
    if (shouldShowOnDesk(e, showNeedsReview)) merged = mergeDeskLiveEvent(merged, e, limit);
  }
  return merged;
}

export function shouldShowOnDesk(e: GateEvent, showNeedsReview: boolean): boolean {
  if (e.status === "Identified") return true;
  return showNeedsReview && e.status === "NeedsReview";
}

export function isWithinDeskLookback(
  timestamp: string,
  pageLoadedAt: number,
  lookbackMs: number,
): boolean {
  return new Date(timestamp).getTime() >= pageLoadedAt - lookbackMs;
}

/** Same merge rules as /desk: update by eventId, otherwise prepend (no person dedup). */
export function mergeDeskLiveEvent(prev: GateEvent[], e: GateEvent, limit = 50): GateEvent[] {
  const idx = prev.findIndex((p) => p.eventId === e.eventId);
  if (idx !== -1) {
    const updated = [...prev];
    if (e.confidence > updated[idx].confidence) updated[idx] = e;
    return sortGateEventsByDetectionDesc(updated);
  }
  return sortGateEventsByDetectionDesc([e, ...prev]).slice(0, limit);
}
