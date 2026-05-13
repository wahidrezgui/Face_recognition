"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents, type GateEvent } from "@/lib/api";
import { EventRow } from "@/components/EventRow";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Identified", label: "Identified" },
  { value: "NeedsReview", label: "Needs Review" },
  { value: "Unrecognized", label: "Unrecognized" },
];

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["events", page, nameFilter, statusFilter],
    queryFn: () => fetchEvents(page, limit, nameFilter || undefined, statusFilter || undefined),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Events</h1>

      <div className="flex gap-3 mb-6">
        <input
          placeholder="Search by name..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1"
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-2">
        {data?.items.map((event: GateEvent) => (
          <EventRow key={event.eventId} event={event} />
        ))}
        {data?.items.length === 0 && !isLoading && (
          <p className="text-gray-500 text-center py-8">No events found.</p>
        )}
      </div>

      {data && data.total > limit && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages} ({data.total} total)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
