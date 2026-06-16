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
