"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventRow } from "@/components/EventRow";
import { fetchEvents, type GateEvent } from "@/lib/api";

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["events", page, nameFilter, statusFilter],
    queryFn: () => fetchEvents(page, 50, nameFilter || undefined, statusFilter || undefined),
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Event Log</h1>

      <div className="flex gap-2 mb-4 text-sm">
        <input
          placeholder="Filter by name..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 flex-1"
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="Identified">Identified</option>
          <option value="NeedsReview">Needs Review</option>
          <option value="Unrecognized">Unrecognized</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-2">
        {data?.items.map((event: GateEvent) => (
          <EventRow key={event.eventId} event={event} />
        ))}
      </div>

      {data && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {Math.ceil(data.total / data.limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / data.limit)}
            className="px-4 py-2 bg-gray-800 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
