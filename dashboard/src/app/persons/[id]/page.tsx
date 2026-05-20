"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { fetchPersons, updatePersonStatus, fetchPersonFaces, uploadFace, updateWelcomeMessage, deletePerson, fetchPersonPoses, poseCompletion, type Person, type FaceImage } from "@/lib/api";
import WebcamEnrollment from "@/components/WebcamEnrollment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const welcomeInitRef = useRef(false);
  const [profileError, setProfileError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgCacheBust, setImgCacheBust] = useState(() => Date.now());
  const [welcomeMsg, setWelcomeMsg] = useState("");

  const { data: persons = [] } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
    staleTime: 0,
  });
  const person = persons.find((p: Person) => p.id === id);

  const { data: faces = [] } = useQuery({
    queryKey: ["person-faces", id],
    queryFn: () => fetchPersonFaces(id),
    enabled: !!person,
  });

  const { data: poses = [] } = useQuery({
    queryKey: ["person-poses", id],
    queryFn: () => fetchPersonPoses(id),
    enabled: !!person,
  });

  const comp = poseCompletion(poses);

  const statusMutation = useMutation({
    mutationFn: (status: string) => updatePersonStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
  });

  const welcomeMutation = useMutation({
    mutationFn: (msg: string) => updateWelcomeMessage(id, msg.trim() || null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deletePerson(id),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      router.push("/persons");
    },
  });

  useEffect(() => {
    if (person && !welcomeInitRef.current) {
      welcomeInitRef.current = true;
      setWelcomeMsg(person.welcomeMessage ?? `Welcome ${person.fullName}`);
    }
  }, [person]);

  const profileImageUrl = `${API_BASE}/api/persons/${id}/profile-image?t=${imgCacheBust}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadFace(id, file);
      setProfileError(false);
      setImgCacheBust(Date.now());
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person-faces", id] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!person) return <p className="p-6 text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-start gap-6 mb-6">
        <div className="relative shrink-0">
          {profileError ? (
            <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          ) : (
            <img src={profileImageUrl} alt="Profile" onError={() => setProfileError(true)}
              className="w-24 h-24 object-cover rounded-full border-2 border-gray-700" />
          )}
          <button onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-700 hover:bg-emerald-600 rounded-full flex items-center justify-center border-2 border-gray-900 transition-colors"
            title="Upload profile picture">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{person.fullName}</h1>
          <p className="text-gray-400">{person.department}</p>
          {uploading && <p className="text-xs text-emerald-400 mt-1">Uploading…</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <p className="font-semibold">{person.enrollmentStatus}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Frames</p>
          <p className={`font-semibold ${person.faceCount === 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {person.faceCount}
            {person.faceCount === 0 && <span className="text-gray-500 text-xs ml-1">— enroll needed</span>}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Added</p>
          <p className="font-semibold">{new Date(person.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Enrolled Faces
          {faces.length > 0 && <span className="text-gray-600 font-normal ml-1">({faces.length})</span>}
        </h2>
        {faces.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {faces.map((face: FaceImage) => (
              <img
                key={face.id}
                src={`${API_BASE}${face.imageUrl}`}
                alt="Enrolled face"
                className="w-24 h-24 object-cover rounded-lg border border-gray-700"
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-sm text-gray-500">No face frames enrolled yet.</p>
            <p className="text-xs text-gray-600 mt-1">Use the enrollment panel below to capture face frames from different angles.</p>
          </div>
        )}
      </div>

      {/* ── Pose Enrollment Progress ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Enrollment Progress — {comp.percent}%
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full mb-4" style={{ background: "#1a2640" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${comp.percent}%`,
                background: comp.percent === 100
                  ? "linear-gradient(90deg, #22d3a5, #10b981)"
                  : "linear-gradient(90deg, #f59e0b, #eab308)",
              }}
            />
          </div>
          {/* Pose grid */}
          <div className="grid grid-cols-5 gap-2">
            {(["frontal", "left", "right", "up", "down"] as const).map((pose) => {
              const done = comp.enrolled.includes(pose);
              return (
                <div
                  key={pose}
                  className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg transition-all"
                  style={{
                    background: done ? "rgba(34,211,165,0.08)" : "rgba(255,255,255,0.02)",
                    border: done ? "1px solid rgba(34,211,165,0.2)" : "1px solid transparent",
                  }}
                >
                  {/* Pose icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: done ? "rgba(34,211,165,0.15)" : "rgba(255,255,255,0.04)",
                      color: done ? "#22d3a5" : "#475569",
                    }}
                  >
                    {pose === "frontal" ? "F" : pose === "left" ? "L" : pose === "right" ? "R" : pose === "up" ? "U" : "D"}
                  </div>
                  <span
                    className="text-[10px] font-medium capitalize transition-colors"
                    style={{ color: done ? "#22d3a5" : "#475569" }}
                  >
                    {pose}
                  </span>
                  {done && (
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Enrollment CTA (zero frames) ── */}
      {person.faceCount === 0 && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
          <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-300">Enrollment required</p>
            <p className="text-xs text-gray-400 mt-1">
              This person has no face frames enrolled. Use the <strong>Face Enrollment</strong> panel below to capture frames before approving.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-8 flex-wrap">
        {person.enrollmentStatus !== "Active" && (
          <div title={person.faceCount === 0 ? "Face enrollment required before approval" : undefined}>
            <button
              onClick={() => statusMutation.mutate("Active")}
              disabled={person.faceCount === 0}
              className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-700">
              Approve
            </button>
          </div>
        )}
        <button onClick={() => statusMutation.mutate("Suspended")}
          className="px-4 py-2 text-sm bg-amber-700 hover:bg-amber-600 rounded-lg transition-colors">
          Suspend
        </button>
        <button onClick={() => statusMutation.mutate("Revoked")}
          className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-lg transition-colors">
          Revoke
        </button>
        <span className="w-px h-8 self-center bg-gray-800" />
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleteMutation.isPending}
          className="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: "rgba(220,38,38,0.12)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.25)" }}
          title="Permanently delete person and all associated data"
        >
          {deleteMutation.isPending ? (
            <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
          Delete
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Kiosk Welcome Message</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">Shown on the kiosk display when this person is identified at the gate.</p>
          <textarea
            value={welcomeMsg}
            onChange={(e) => { setWelcomeMsg(e.target.value); welcomeMutation.reset(); }}
            rows={3}
            maxLength={500}
            placeholder={`Welcome ${person.fullName}`}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{welcomeMsg.length}/500</span>
            <div className="flex items-center gap-3">
              {welcomeMutation.isSuccess && (
                <span className="text-xs text-emerald-400">Saved</span>
              )}
              {welcomeMutation.isError && (
                <span className="text-xs text-red-400">Failed to save</span>
              )}
              <button
                onClick={() => welcomeMutation.mutate(welcomeMsg)}
                disabled={welcomeMutation.isPending}
                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {welcomeMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <WebcamEnrollment personId={id} onComplete={() => {
        queryClient.invalidateQueries({ queryKey: ["persons"] });
        queryClient.refetchQueries({ queryKey: ["persons"] });
        queryClient.invalidateQueries({ queryKey: ["person-poses", id] });
      }} />

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-xl overflow-hidden"
            style={{
              background: "#0a1020",
              border: "1px solid #1a2640",
              boxShadow: "0 0 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── icon + heading ── */}
            <div className="flex flex-col items-center pt-8 pb-2 px-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(239,68,68,0.12)" }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3
                className="text-sm font-semibold text-center"
                style={{ color: "#f1f5f9", fontFamily: "'Oxanium', monospace" }}
              >
                Delete Person
              </h3>
              <p className="text-xs text-center mt-2 leading-relaxed" style={{ color: "#94a3b8" }}>
                Permanently delete <span className="font-semibold" style={{ color: "#e2e8f0" }}>{person.fullName}</span> and all associated data:
              </p>
            </div>

            {/* ── consequences ── */}
            <div className="px-6 pb-4 space-y-1.5">
              {[
                "Face embeddings and enrolled images",
                "Profile picture",
                "Gate event links (events preserved as unknown)",
              ].map((text) => (
                <div key={text} className="flex items-start gap-2 text-xs" style={{ color: "#64748b" }}>
                  <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full bg-red-500/60" />
                  {text}
                </div>
              ))}
            </div>

            {/* ── buttons ── */}
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "transparent",
                  border: "1px solid #1a2640",
                  color: "#64748b",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.25)",
                  fontFamily: "'Oxanium', monospace",
                }}
              >
                {deleteMutation.isPending ? (
                  <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
