"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EventRow } from "@/components/EventRow";
import { fetchEvents, createEventStream, updatePersonStatus, type GateEvent } from "@/lib/api";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<GateEvent[]>([]);

  const { data } = useQuery({
    queryKey: ["events", 1, "", "NeedsReview"],
    queryFn: () => fetchEvents(1, 100, undefined, "NeedsReview"),
  });

  useEffect(() => {
    if (data?.items) setAlerts(data.items);
  }, [data]);

  useEffect(() => {
    const es = createEventStream((event) => {
      if (event.status === "NeedsReview") {
        setAlerts((prev) => [event, ...prev].slice(0, 200));
      }
    });
    return () => es.close();
  }, []);

  const approveMutation = useMutation({
    mutationFn: (personId: string) => updatePersonStatus(personId, "Active"),
  });

  const blockMutation = useMutation({
    mutationFn: (personId: string) => updatePersonStatus(personId, "Revoked"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const dismiss = (eventId: string) => {
    setAlerts((prev) => prev.filter((e) => e.eventId !== eventId));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Alerts</h1>
      <p className="text-gray-400 mb-6">
        Unknown face events and matches requiring review
      </p>

      <div className="space-y-2">
        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No alerts. All clear.
          </p>
        )}
        {alerts.map((event: GateEvent) => (
          <div key={event.eventId} className="flex items-start gap-2">
            <div className="flex-1">
              <EventRow event={event} />
            </div>
            <div className="flex gap-1 pt-3 shrink-0">
              {event.personId && (
                <button
                  onClick={() => approveMutation.mutate(event.personId!)}
                  className="px-2 py-1 text-xs bg-emerald-800 hover:bg-emerald-700 rounded transition-colors"
                  title="Approve person"
                >
                  Approve
                </button>
              )}
              {event.status === "NeedsReview" && (
                <button
                  onClick={() => dismiss(event.eventId)}
                  className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                  title="Mark reviewed"
                >
                  Dismiss
                </button>
              )}
              {event.personId && (
                <button
                  onClick={() => blockMutation.mutate(event.personId!)}
                  className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 rounded transition-colors"
                  title="Block person"
                >
                  Block
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
