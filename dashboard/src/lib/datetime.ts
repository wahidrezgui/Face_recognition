import type { GateEvent } from "@/lib/api";

/** Newest detection first; eventId breaks ties for stable ordering. */
export function sortGateEventsByDetectionDesc(events: GateEvent[]): GateEvent[] {
  return [...events].sort((a, b) => {
    const byTime = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (byTime !== 0) return byTime;
    return b.eventId.localeCompare(a.eventId);
  });
}

export function localTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isEventFromToday(timestamp: string): boolean {
  return new Date(timestamp) >= localTodayStart();
}

/** One thumbnail per person (newest win); unknowns keyed by eventId. */
export function dedupeCapturesByPerson(events: GateEvent[]): GateEvent[] {
  const sorted = sortGateEventsByDetectionDesc(events);
  const seen = new Set<string>();
  const out: GateEvent[] = [];
  for (const e of sorted) {
    const key = e.personId ?? e.eventId;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** Display helpers — DB stores UTC; UI shows the viewer's local time. */
export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export function formatLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatLocalDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** JS getTimezoneOffset(): minutes to add to local time to get UTC. */
export function browserTzOffsetMinutes(): number {
  return new Date().getTimezoneOffset();
}

export function localTimezoneLabel(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
