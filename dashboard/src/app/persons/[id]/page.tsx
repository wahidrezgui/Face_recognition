"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchPersons, updatePersonStatus, fetchPersonFaces, uploadFace, updateWelcomeMessage, type FaceImage } from "@/lib/api";
import WebcamEnrollment from "@/components/WebcamEnrollment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
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
  const person = persons.find((p: any) => p.id === id);

  const { data: faces = [] } = useQuery({
    queryKey: ["person-faces", id],
    queryFn: () => fetchPersonFaces(id),
    enabled: person?.enrollmentStatus === "Active",
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updatePersonStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
  });

  const welcomeMutation = useMutation({
    mutationFn: (msg: string) => updateWelcomeMessage(id, msg.trim() || null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["persons"] }),
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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <p className="font-semibold">{person.enrollmentStatus}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Added</p>
          <p className="font-semibold">{new Date(person.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {person.enrollmentStatus === "Active" && faces.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Enrolled Faces</h2>
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

      <WebcamEnrollment personId={id} onComplete={() => { queryClient.invalidateQueries({ queryKey: ["persons"] }); queryClient.refetchQueries({ queryKey: ["persons"] }); }} />
    </div>
  );
}
