"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPersonsPaged,
  createPerson,
  reviewEvent,
  deleteEvent,
  validateGateEvent,
  enrollWithFrames,
  enrollFromEventFace,
  type GateEvent,
  type Person,
} from "@/lib/api";
import { statusColor } from "@/components/events/EventCard";
import { QuickCapture } from "@/components/events/QuickCapture";

type Tab = "link" | "create" | "delete";
type LinkMode = "link" | "enroll" | "capture" | "validate";
type CapturePhase = "idle" | "capturing" | "enrolling" | "done";

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

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: personsPage } = useQuery({
    queryKey: ["persons-search", debouncedSearch],
    queryFn: () => fetchPersonsPaged({ search: debouncedSearch || undefined, pageSize: 50 }),
  });
  const filtered = personsPage?.items ?? [];

  const faceSrc = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;
  const time = new Date(event.timestamp);
  const hasFace = !!event.faceImageBase64;

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["persons-search"] });
    queryClient.invalidateQueries({ queryKey: ["validated-events"] });
    queryClient.invalidateQueries({ queryKey: ["validated-events-stats"] });
  }

  // After linking a person, optionally promote to Access Log
  async function promoteToAccessLog(personId: string) {
    try { await validateGateEvent(event.eventId, personId); } catch { /* already validated or no-op */ }
  }

  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("idle");
  const [linkedPersonId, setLinkedPersonId] = useState<string | null>(null);
  const [enrolledPoses, setEnrolledPoses] = useState<string[] | null>(null);

  // ── Link tab actions ──────────────────────────────────────────────────────
  async function handleLink(mode: LinkMode) {
    if (!selectedPersonId) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      if (mode === "enroll" && hasFace) {
        setCapturePhase("enrolling");
        const result = await enrollFromEventFace(event.gateId ?? "", selectedPersonId, event.faceImageBase64!);
        await reviewEvent(event.eventId, selectedPersonId);
        setEnrolledPoses(result.poses ?? []);
        setLinkedPersonId(selectedPersonId);
        setCapturePhase("done");
        invalidateAll();
        return;
      }

      await reviewEvent(event.eventId, selectedPersonId);

      if (mode === "validate") {
        await promoteToAccessLog(selectedPersonId);
        invalidateAll();
        onDone();
        return;
      }

      if (mode === "capture") {
        setLinkedPersonId(selectedPersonId);
        setCapturePhase("capturing");
        return;
      }

      invalidateAll();
      onDone();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to link person");
      setCapturePhase("idle");
    } finally {
      setBusy(false);
    }
  }

  // ── Create tab actions ────────────────────────────────────────────────────
  async function handleCreate(mode: "link" | "enroll" | "capture") {
    if (!newName || !newDept) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const person = await createPerson(newName, newDept);

      if (mode === "enroll" && hasFace) {
        // Enroll first — if the face service is down the event stays NeedsReview
        setCapturePhase("enrolling");
        const result = await enrollFromEventFace(event.gateId ?? "", person.id, event.faceImageBase64!);
        await reviewEvent(event.eventId, person.id);
        setEnrolledPoses(result.poses ?? []);
        setLinkedPersonId(person.id);
        setCapturePhase("done");
        invalidateAll();
        return;
      }

      await reviewEvent(event.eventId, person.id);

      if (mode === "capture") {
        setLinkedPersonId(person.id);
        setCapturePhase("capturing");
        return;
      }

      invalidateAll();
      onDone();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to create person");
      setCapturePhase("idle");
    } finally {
      setBusy(false);
    }
  }

  // ── Webcam frames ready — replace existing embeddings ────────────────────
  const handleFramesReady = useCallback(async (frames: string[]) => {
    if (!linkedPersonId) return;
    setCapturePhase("enrolling");
    setStatusMsg(null);
    try {
      // replace=true: wipe gate-camera embedding and store fresh webcam embeddings
      const result = await enrollWithFrames(event.gateId ?? "", linkedPersonId, frames, true);
      setEnrolledPoses(result.poses ?? []);
      setCapturePhase("done");
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Failed to enroll face");
      setCapturePhase("idle");
    }
  }, [linkedPersonId]);

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

  // ── Shared views ──────────────────────────────────────────────────────────

  const enrollingView = capturePhase === "enrolling" && (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <p className="text-xs text-gray-400">Enrolling face embeddings…</p>
    </div>
  );

  const doneView = capturePhase === "done" && enrolledPoses && (
    <div className="flex flex-col items-center gap-4 py-4">
      <div
        className="rounded-full border-2 border-emerald-500 flex items-center justify-center"
        style={{ width: 72, height: 72, boxShadow: "0 0 32px rgba(34,197,94,0.25)" }}
      >
        <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-emerald-400 font-semibold text-sm">Enrolled successfully</p>
      <div className="flex gap-2 flex-wrap justify-center">
        {["frontal", "left", "right", "up", "down"].map((p) => {
          const has = enrolledPoses.includes(p);
          return (
            <div
              key={p}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
              style={{
                background: has ? "rgba(34,211,165,0.1)" : "rgba(255,255,255,0.03)",
                border: has ? "1px solid rgba(34,211,165,0.25)" : "1px solid rgba(255,255,255,0.08)",
                color: has ? "#22d3a5" : "#475569",
              }}
            >
              {has ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-3 h-3 text-[9px]">·</span>
              )}
              {p}
            </div>
          );
        })}
      </div>
      {enrolledPoses.length < 5 && (
        <p className="text-[10px] text-gray-600 text-center max-w-[220px]">
          Use <span style={{ color: "#22d3a5" }}>Link &amp; Replace Webcam</span> on the next event to add more angles.
        </p>
      )}
      <button
        onClick={() => { invalidateAll(); onDone(); }}
        className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
        style={{ background: "rgba(34,211,165,0.12)", color: "#22d3a5", border: "1px solid rgba(34,211,165,0.25)" }}
      >
        Done
      </button>
    </div>
  );

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
        <div className="px-5 py-4 max-h-[360px] overflow-y-auto">
          {doneView}
          {enrollingView}

          {statusMsg && !doneView && !enrollingView && (
            <div className="mb-3 text-xs px-3 py-2 rounded" style={{ background: "#f8717115", color: "#f87171", border: "1px solid #f8717130" }}>
              {statusMsg}
            </div>
          )}

          {/* ── Link tab ── */}
          {tab === "link" && capturePhase === "capturing" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-xs text-gray-400">Event linked. Capture different angles — this will replace any existing embeddings.</p>
              <QuickCapture onFramesReady={handleFramesReady} onCancel={() => setCapturePhase("idle")} />
            </div>
          )}

          {tab === "link" && capturePhase === "idle" && (
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Search persons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2640", color: "#cbd5e1", outline: "none" }}
              />
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
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

              {/* Row 1: Link Only + Link & Enroll (from event face) */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleLink("link")}
                  disabled={busy || !selectedPersonId}
                  className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "transparent",
                    color: "#64748b",
                    border: "1px solid #1a2640",
                    fontFamily: "'Oxanium', monospace",
                  }}
                >
                  {busy ? "…" : "Link Only"}
                </button>
                {hasFace && (
                  <button
                    onClick={() => handleLink("enroll")}
                    disabled={busy || !selectedPersonId}
                    className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(34,211,165,0.12)",
                      color: "#22d3a5",
                      border: "1px solid rgba(34,211,165,0.3)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    {busy ? "…" : "Link & Enroll ⚡"}
                  </button>
                )}
              </div>

              {/* Row 2: Link & Approve → Access Log */}
              <button
                onClick={() => handleLink("validate")}
                disabled={busy || !selectedPersonId}
                className="w-full px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "rgba(34,211,165,0.07)",
                  color: "#22d3a5",
                  border: "1px solid rgba(34,211,165,0.22)",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                {busy ? "…" : "🛡 Link & Add to Access Log"}
              </button>

              {/* Row 3: Link & Replace via Webcam */}
              <button
                onClick={() => handleLink("capture")}
                disabled={busy || !selectedPersonId}
                className="w-full px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.25)",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                {busy ? "…" : "Link & Replace via Webcam"}
              </button>
              {hasFace && (
                <p className="text-[10px] text-center" style={{ color: "#374151" }}>
                  ⚡ uses gate camera face · Webcam replaces embeddings
                </p>
              )}
            </div>
          )}

          {/* ── Create tab ── */}
          {tab === "create" && capturePhase === "capturing" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-xs text-gray-400">Person created &amp; linked. Capture different angles — this will replace any existing embeddings.</p>
              <QuickCapture onFramesReady={handleFramesReady} onCancel={() => setCapturePhase("idle")} />
            </div>
          )}

          {tab === "create" && capturePhase === "idle" && (
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

              {/* Row 1: Create & Link + Create, Link & Enroll */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleCreate("link")}
                  disabled={busy || !newName || !newDept}
                  className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "transparent",
                    color: "#64748b",
                    border: "1px solid #1a2640",
                    fontFamily: "'Oxanium', monospace",
                  }}
                >
                  {busy ? "…" : "Create & Link"}
                </button>
                {hasFace && (
                  <button
                    onClick={() => handleCreate("enroll")}
                    disabled={busy || !newName || !newDept}
                    className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(34,211,165,0.12)",
                      color: "#22d3a5",
                      border: "1px solid rgba(34,211,165,0.3)",
                      fontFamily: "'Oxanium', monospace",
                    }}
                  >
                    {busy ? "…" : "Create & Enroll ⚡"}
                  </button>
                )}
              </div>

              {/* Row 2: Create & Replace via Webcam */}
              <button
                onClick={() => handleCreate("capture")}
                disabled={busy || !newName || !newDept}
                className="w-full px-3 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.25)",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                {busy ? "…" : "Create & Enroll via Webcam"}
              </button>
              {hasFace && (
                <p className="text-[10px] text-center" style={{ color: "#374151" }}>
                  ⚡ uses gate camera face · Webcam replaces embeddings
                </p>
              )}
            </div>
          )}

          {/* ── Delete tab ── */}
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
