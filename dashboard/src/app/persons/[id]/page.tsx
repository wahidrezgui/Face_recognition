"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchPersons, updatePersonStatus, fetchPersonFaces, type FaceImage } from "@/lib/api";
import WebcamEnrollment from "@/components/WebcamEnrollment";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

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

  if (!person) return <p className="p-6 text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">{person.fullName}</h1>
      <p className="text-gray-400 mb-6">{person.department}</p>

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
                src={`data:image/jpeg;base64,${face.image}`}
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

      <WebcamEnrollment personId={id} onComplete={() => { queryClient.invalidateQueries({ queryKey: ["persons"] }); queryClient.refetchQueries({ queryKey: ["persons"] }); }} />
    </div>
  );
}
