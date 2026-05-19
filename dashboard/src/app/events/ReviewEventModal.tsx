"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPersons,
  createPerson,
  reviewEvent,
  deleteEvent,
  enrollFaceFromBase64,
  type GateEvent,
  type Person,
} from "@/lib/api";
import { statusColor } from "@/components/events/EventCard";

type Tab = "link" | "create" | "delete";

export default function ReviewEventModal({
  event,
  onClose,
  onDone,
}: {
  event: GateEvent;
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const col = statusColor(event.status);

  const [tab, setTab] = useState<Tab>("link");
  const [search, setSearch] = useState(event.personName && event.personName !== "UNKNOWN" ? event.personName : "");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(event.personId);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
  });

  const filtered = persons.filter((p: Person) =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const faceSrc = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;
  const time = new Date(event.timestamp);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["persons"] });
  }

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleLink(enroll: boolean) {
    if (!selectedPersonId) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await reviewEvent(event.eventId, selectedPersonId);
      if (enroll && event.faceImageBase64) {
        await enrollFaceFromBase64(selectedPersonId, event.faceImageBase64);
      }
      invalidateAll();
      onDone();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to link person");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(enroll: boolean) {
    if (!newName || !newDept) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const person = await createPerson(newName, newDept);
      await reviewEvent(event.eventId, person.id);
      if (enroll && event.faceImageBase64) {
        await enrollFaceFromBase64(person.id, event.faceImageBase64);
      }
      invalidateAll();
      onDone();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to create person");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setStatusMsg(null);
    try {
      await deleteEvent(event.eventId);
      invalidateAll();
      onDone();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to delete event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "#0a1020",
          border: "1px solid #1a2640",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a2640" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#e2e8f0", fontFamily: "'Oxanium', monospace" }}>
            Review Event
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        {/* ── Event face + info ──────────────────── */}
        <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: "#1a2640", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: "#0d1424", border: "1px solid #1a2640" }}>
            {faceSrc ? (
              <img src={faceSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700 text-lg font-bold">?</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate" style={{ color: "#e2e8f0" }}>
                {event.personName === "UNKNOWN" ? "Unidentified" : event.personName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: col, background: `${col}15`, border: `1px solid ${col}25`, fontFamily: "'Oxanium', monospace" }}>
                {event.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-mono" style={{ color: "#64748b" }}>
              <span>{Math.round(event.confidence * 100)}% confidence</span>
              <span className="capitalize">{event.direction}</span>
              <span>{time.toLocaleTimeString("en-US", { hour12: false })}</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────── */}
        <div className="flex border-b" style={{ borderColor: "#1a2640" }}>
          {([
            { key: "link", label: "Link to Person" },
            { key: "create", label: "Create Person" },
            { key: "delete", label: "Delete" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 text-xs font-semibold py-2.5 transition-all"
              style={{
                fontFamily: "'Oxanium', monospace",
                color: tab === t.key ? "#e2e8f0" : "#475569",
                background: tab === t.key ? "rgba(255,255,255,0.03)" : "transparent",
                borderBottom: tab === t.key ? `2px solid ${col}` : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────── */}
        <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
          {statusMsg && (
            <div className="mb-3 text-xs px-3 py-2 rounded" style={{ background: "#f8717115", color: "#f87171", border: "1px solid #f8717130" }}>
              {statusMsg}
            </div>
          )}

          {tab === "link" && (
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Search persons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2640", color: "#cbd5e1", outline: "none" }}
              />
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {filtered.map((p: Person) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPersonId(p.id); setSearch(p.fullName); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-left transition-all"
                    style={{
                      background: selectedPersonId === p.id ? "rgba(34,211,165,0.08)" : "transparent",
                      border: selectedPersonId === p.id ? "1px solid rgba(34,211,165,0.25)" : "1px solid transparent",
                      color: "#cbd5e1",
                    }}
                  >
                    <span className="flex-1 truncate">{p.fullName}</span>
                    <span className="text-[9px] shrink-0" style={{ color: "#64748b" }}>{p.department}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-4">No persons found</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleLink(false)}
                  disabled={busy || !selectedPersonId}
                  className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(34,211,165,0.1)",
                    color: "#22d3a5",
                    border: "1px solid rgba(34,211,165,0.25)",
                    fontFamily: "'Oxanium', monospace",
                  }}
                >
                  {busy ? "..." : "Link Only"}
                </button>
                {event.faceImageBase64 && (
                  <button
                    onClick={() => handleLink(true)}
                    disabled={busy || !selectedPersonId}
                    className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(34,211,165,0.18)",
                      color: "#22d3a5",
                      border: "1px solid rgba(34,211,165,0.35)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    {busy ? "..." : "Link & Enroll"}
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "create" && (
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2640", color: "#cbd5e1", outline: "none" }}
              />
              <input
                placeholder="Department"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2640", color: "#cbd5e1", outline: "none" }}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleCreate(false)}
                  disabled={busy || !newName || !newDept}
                  className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.25)",
                    fontFamily: "'Oxanium', monospace",
                  }}
                >
                  {busy ? "..." : "Create & Link"}
                </button>
                {event.faceImageBase64 && (
                  <button
                    onClick={() => handleCreate(true)}
                    disabled={busy || !newName || !newDept}
                    className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(99,102,241,0.2)",
                      color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.35)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    {busy ? "..." : "Create, Link & Enroll"}
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "delete" && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                This will permanently delete this event from the database. This action cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="w-full px-3 py-2.5 rounded text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "rgba(248,113,113,0.12)",
                  color: "#f87171",
                  border: "1px solid rgba(248,113,113,0.25)",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                {busy ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────── */}
        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: "#1a2640" }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "transparent",
              border: "1px solid #1a2640",
              color: "#64748b",
              fontFamily: "'Oxanium', monospace",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
