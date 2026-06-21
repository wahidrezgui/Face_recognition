"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPersons, updateTrainingEvent, type GateEvent, type Person } from "@/lib/api";
import { toast } from "sonner";

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1a2640",
  color: "#cbd5e1",
  outline: "none",
};

const labelStyle = { color: "#64748b", fontFamily: "'Oxanium', monospace" };

export default function EditTrainingEventModal({
  event,
  onClose,
  onDone,
}: {
  event: GateEvent;
  onClose: () => void;
  onDone: (updated: GateEvent) => void;
}) {
  const queryClient = useQueryClient();

  const [personSearch, setPersonSearch] = useState(
    event.personName && event.personName !== "UNKNOWN" ? event.personName : ""
  );
  const [personId, setPersonId] = useState<string | null>(event.personId);
  const [status, setStatus] = useState<"NeedsReview" | "Identified">(
    (event.status as "NeedsReview" | "Identified") ?? "NeedsReview"
  );
  const [confidence, setConfidence] = useState(event.confidence);
  const [capturedAt, setCapturedAt] = useState(toDatetimeLocal(event.timestamp));
  const [emotion, setEmotion] = useState(event.emotion ?? "");
  const [age, setAge] = useState(event.age != null ? String(event.age) : "");
  const [gender, setGender] = useState(event.gender ?? "");
  const [busy, setBusy] = useState(false);
  const [personListOpen, setPersonListOpen] = useState(false);

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
  });

  const filteredPersons = persons.filter((p: Person) =>
    !personSearch || p.fullName.toLowerCase().includes(personSearch.toLowerCase())
  );

  async function handleSave() {
    setBusy(true);
    try {
      const updated = await updateTrainingEvent(event.eventId, {
        personId: personId ?? null,
        confidence,
        status,
        capturedAt: new Date(capturedAt).toISOString(),
        emotion: emotion || null,
        age: age !== "" ? Number(age) : null,
        gender: gender || null,
      });
      queryClient.invalidateQueries({ queryKey: ["training-events"] });
      toast.success("Event updated");
      onDone(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update event");
    } finally {
      setBusy(false);
    }
  }

  const faceSrc = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: "#0a1020",
          border: "1px solid #1a2640",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a2640" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#e2e8f0", fontFamily: "'Oxanium', monospace" }}>
            Edit Training Event
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        {/* Event face + id */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#1a2640", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "#0d1424", border: "1px solid #1a2640" }}>
            {faceSrc ? (
              <img src={faceSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700 text-lg font-bold">?</div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>
              {event.personName === "UNKNOWN" ? "Unidentified" : event.personName}
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "#374151" }}>
              {event.eventId.slice(0, 16)}…
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[420px] overflow-y-auto">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "NeedsReview" | "Identified")}
              className="px-2.5 py-1.5 rounded text-xs"
              style={inputStyle}
            >
              <option value="NeedsReview">NeedsReview</option>
              <option value="Identified">Identified</option>
            </select>
          </div>

          {/* Person */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>
              Linked Person
              {personId && (
                <button
                  onClick={() => { setPersonId(null); setPersonSearch(""); }}
                  className="ml-2 normal-case font-normal"
                  style={{ color: "#f87171", fontFamily: "inherit" }}
                >
                  (clear)
                </button>
              )}
            </label>
            <input
              placeholder="Search persons…"
              value={personSearch}
              onChange={(e) => { setPersonSearch(e.target.value); setPersonListOpen(true); }}
              onFocus={() => setPersonListOpen(true)}
              className="px-2.5 py-1.5 rounded text-xs w-full"
              style={inputStyle}
            />
            {personListOpen && personSearch && (
              <div
                className="absolute top-full left-0 right-0 z-10 rounded overflow-auto mt-0.5"
                style={{ background: "#0d1424", border: "1px solid #1a2640", maxHeight: 140 }}
              >
                {filteredPersons.slice(0, 20).map((p: Person) => (
                  <button
                    key={p.id}
                    onClick={() => { setPersonId(p.id); setPersonSearch(p.fullName); setPersonListOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-white/5"
                    style={{
                      background: personId === p.id ? "rgba(34,211,165,0.08)" : "transparent",
                      color: "#cbd5e1",
                    }}
                  >
                    <span className="flex-1 truncate">{p.fullName}</span>
                    {p.militaryNumber != null && (
                      <span className="text-[9px] shrink-0" style={{ color: "#374151" }}>#{p.militaryNumber}</span>
                    )}
                  </button>
                ))}
                {filteredPersons.length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-3">No persons found</p>
                )}
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between" style={labelStyle}>
              <span>Confidence</span>
              <span style={{ color: "#94a3b8" }}>{Math.round(confidence * 100)}%</span>
            </label>
            <input
              type="range"
              min={0} max={1} step={0.001}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Timestamp */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Captured At</label>
            <input
              type="datetime-local"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
              className="px-2.5 py-1.5 rounded text-xs w-full"
              style={inputStyle}
            />
          </div>

          {/* Emotion + Age + Gender */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Emotion</label>
              <input
                placeholder="—"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="px-2.5 py-1.5 rounded text-xs"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Age</label>
              <input
                type="number"
                placeholder="—"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={0} max={120}
                className="px-2.5 py-1.5 rounded text-xs"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={labelStyle}>Gender</label>
              <input
                placeholder="—"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="px-2.5 py-1.5 rounded text-xs"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: "#1a2640" }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold"
            style={{ background: "transparent", border: "1px solid #1a2640", color: "#64748b", fontFamily: "'Oxanium', monospace" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(34,211,165,0.12)", color: "#22d3a5", border: "1px solid rgba(34,211,165,0.3)", fontFamily: "'Oxanium', monospace" }}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
