import type { GateEvent } from "@/lib/api";

function initials(name: string): string {
  if (name === "UNKNOWN" || !name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusBadge(status: string | undefined) {
  switch (status) {
    case "Identified":
      return "bg-emerald-900 text-emerald-300";
    case "NeedsReview":
      return "bg-amber-900 text-amber-300";
    case "Unrecognized":
      return "bg-red-900 text-red-300";
    default:
      return "bg-gray-800 text-gray-300";
  }
}

export function EventRow({ event }: { event: GateEvent }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold shrink-0">
        {initials(event.personName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{event.personName}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.round(event.confidence * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {Math.round(event.confidence * 100)}%
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">
          {new Date(event.timestamp).toLocaleTimeString()}
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded ${statusBadge(event.status)}`}
        >
          {event.status || "Unknown"}
        </span>
      </div>
    </div>
  );
}
