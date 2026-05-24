"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPersons,
  updatePerson,
  updatePersonStatus,
  fetchPersonFaces,
  uploadFace,
  updateWelcomeMessage,
  deletePerson,
  fetchPersonPoses,
  poseCompletion,
  deletePersonFace,
  resetPersonFaces,
  type Person,
  type FaceImage,
} from "@/lib/api";
import { statusBadgeClass } from "@/lib/person-status";
import { cn } from "@/lib/utils";
import WebcamEnrollment from "@/components/WebcamEnrollment";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const POSES = ["frontal", "left", "right", "up", "down"] as const;
const POSE_LABEL: Record<(typeof POSES)[number], string> = {
  frontal: "F",
  left: "L",
  right: "R",
  up: "U",
  down: "D",
};

function PersonDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex gap-5">
        <Skeleton className="h-28 w-28 shrink-0 rounded-full bg-gv-panel" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-7 w-48 bg-gv-panel" />
          <Skeleton className="h-4 w-32 bg-gv-panel" />
          <Skeleton className="h-6 w-20 bg-gv-panel" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-gv-panel" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl bg-gv-panel" />
      <Skeleton className="h-64 rounded-xl bg-gv-panel" />
    </div>
  );
}

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");

  const { data: persons = [], isLoading } = useQuery({
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
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success(`Status updated to ${status}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update status"),
  });

  const welcomeMutation = useMutation({
    mutationFn: (msg: string) => updateWelcomeMessage(id, msg.trim() || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Welcome message saved");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to save message"),
  });

  const editMutation = useMutation({
    mutationFn: (data: { fullName?: string; department?: string }) => updatePerson(id, data),
    onSuccess: () => {
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Person updated");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update person"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePerson(id),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Person deleted");
      router.push("/persons");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete person"),
  });

  const deleteFaceMutation = useMutation({
    mutationFn: (faceId: string) => deletePersonFace(id, faceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["person-faces", id] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person-poses", id] });
      toast.success("Face removed");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove face"),
  });

  const [resetOpen, setResetOpen] = useState(false);
  const resetFacesMutation = useMutation({
    mutationFn: () => resetPersonFaces(id),
    onSuccess: () => {
      setResetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["person-faces", id] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person-poses", id] });
      toast.success("Enrollment reset — ready to re-enroll");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to reset enrollment"),
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
      toast.success("Profile photo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-gv-bg">
        <div className="border-b border-gv-border px-6 py-4">
          <Skeleton className="h-4 w-24 bg-gv-panel" />
        </div>
        <PersonDetailSkeleton />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] flex-col items-center justify-center gap-4 bg-gv-bg p-6">
        <User className="size-12 text-gv-muted opacity-40" />
        <p className="text-sm text-gv-muted">Person not found</p>
        <Button variant="outline" asChild>
          <Link href="/persons">Back to persons</Link>
        </Button>
      </div>
    );
  }

  const needsEnrollment = person.faceCount === 0;

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
      {/* Top bar */}
      <div className="shrink-0 border-b border-gv-border bg-gv-panel-header px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-gv-muted" asChild>
            <Link href="/persons">
              <ArrowLeft className="size-3.5" />
              Persons
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
        {/* Hero */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-center sm:self-start">
            {profileError ? (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gv-border bg-gv-panel text-gv-muted">
                <User className="size-10 opacity-50" />
              </div>
            ) : (
              <img
                src={profileImageUrl}
                alt={person.fullName}
                onError={() => setProfileError(true)}
                className="h-28 w-28 rounded-full border-2 border-gv-border object-cover shadow-lg shadow-black/30"
              />
            )}
            <Button
              type="button"
              size="icon"
              className="absolute -bottom-1 -right-1 size-9 rounded-full border-2 border-gv-bg bg-emerald-700 hover:bg-emerald-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload profile picture"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-display text-xl font-semibold tracking-wide text-white sm:text-2xl">
                {person.fullName}
              </h1>
              <button
                onClick={() => { setEditName(person.fullName); setEditDept(person.department); setEditOpen(true); }}
                className="inline-flex size-7 items-center justify-center rounded-md text-gv-muted transition-colors hover:bg-gv-panel hover:text-white"
                title="Edit person"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gv-muted">{person.department}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className={cn(
                  "rounded border px-2.5 py-1 text-xs font-medium",
                  statusBadgeClass(person.enrollmentStatus),
                )}
              >
                {person.enrollmentStatus}
              </span>
              {person.faceCount > 0 && (
                <Badge variant="outline" className="border-gv-border text-gv-muted">
                  {person.faceCount} enrolled frame{person.faceCount !== 1 ? "s" : ""}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "border-gv-border",
                  comp.percent === 100 ? "text-emerald-400" : "text-amber-400",
                )}
              >
                {comp.percent}% poses
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Status", value: person.enrollmentStatus },
            {
              label: "Face frames",
              value: String(person.faceCount),
              highlight: person.faceCount === 0 ? "text-amber-400" : "text-emerald-400",
              hint: person.faceCount === 0 ? "Enroll needed" : undefined,
            },
            {
              label: "Added",
              value: new Date(person.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gv-border bg-gv-panel px-4 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gv-muted">
                {stat.label}
              </p>
              <p className={cn("mt-1 font-display text-lg font-semibold text-white", stat.highlight)}>
                {stat.value}
                {stat.hint && (
                  <span className="ml-1.5 text-xs font-normal text-gv-muted">{stat.hint}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {needsEnrollment && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-600/25 bg-amber-950/30 px-4 py-3">
            <svg
              className="mt-0.5 size-5 shrink-0 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-300">Enrollment required</p>
              <p className="mt-0.5 text-xs text-gv-muted">
                Capture face frames below before approving this person for gate access.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {person.enrollmentStatus !== "Active" && (
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-600"
              disabled={needsEnrollment || statusMutation.isPending}
              onClick={() => statusMutation.mutate("Active")}
              title={needsEnrollment ? "Face enrollment required before approval" : undefined}
            >
              Approve
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-amber-800/50 text-amber-300 hover:bg-amber-950/40"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate("Suspended")}
          >
            Suspend
          </Button>
          <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Enrolled faces */}
          <SectionCard
            title="Enrolled faces"
            description="Reference images used for recognition"
            action={
              faces.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gv-border text-gv-muted">
                    {faces.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 border-red-900/50 px-2 text-xs text-red-300 hover:bg-red-950/40"
                    onClick={() => setResetOpen(true)}
                    disabled={resetFacesMutation.isPending}
                  >
                    <Trash2 className="size-3" />
                    Reset
                  </Button>
                </div>
              ) : undefined
            }
            className="lg:col-span-2"
          >
            {faces.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {faces.map((face: FaceImage) => (
                  <div
                    key={face.id}
                    className="group relative overflow-hidden rounded-lg border border-gv-border bg-black/20"
                  >
                    <img
                      src={`${API_BASE}${face.imageUrl}`}
                      alt="Enrolled face"
                      className="h-24 w-24 object-cover"
                    />
                    <button
                      onClick={() => deleteFaceMutation.mutate(face.id)}
                      disabled={deleteFaceMutation.isPending}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove this face"
                    >
                      <Trash2 className="size-5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-gv-border py-10 text-center">
                <User className="mb-2 size-10 text-gv-muted opacity-30" />
                <p className="text-sm text-gv-muted">No face frames enrolled yet</p>
                <p className="mt-1 max-w-xs text-xs text-gv-muted/80">
                  Use the enrollment panel below to capture frames from different angles.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Pose progress */}
          <SectionCard
            title="Pose coverage"
            description={`${comp.percent}% complete — ${comp.enrolled.length} of ${POSES.length} poses`}
          >
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-gv-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  comp.percent === 100
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-amber-500 to-yellow-400",
                )}
                style={{ width: `${comp.percent}%` }}
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {POSES.map((pose) => {
                const done = comp.enrolled.includes(pose);
                return (
                  <div
                    key={pose}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 transition-colors",
                      done
                        ? "border-emerald-600/30 bg-emerald-950/30"
                        : "border-transparent bg-white/[0.02]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                        done
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-gv-border-subtle text-gv-muted",
                      )}
                    >
                      {POSE_LABEL[pose]}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium capitalize",
                        done ? "text-emerald-400" : "text-gv-muted",
                      )}
                    >
                      {pose}
                    </span>
                    {done && <Check className="size-3 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Welcome message */}
          <SectionCard
            title="Kiosk welcome"
            description="Shown when this person is identified at the gate"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="welcome-msg" className="text-xs text-gv-muted">
                  Message
                </Label>
                <Textarea
                  id="welcome-msg"
                  value={welcomeMsg}
                  onChange={(e) => setWelcomeMsg(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={`Welcome ${person.fullName}`}
                  className="resize-none border-gv-border bg-gv-bg text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-gv-muted">
                  {welcomeMsg.length}/500
                </span>
                <Button
                  size="sm"
                  disabled={welcomeMutation.isPending}
                  onClick={() => welcomeMutation.mutate(welcomeMsg)}
                >
                  {welcomeMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save message"
                  )}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Enrollment — full width */}
        <WebcamEnrollment
          personId={id}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["persons"] });
            queryClient.refetchQueries({ queryKey: ["persons"] });
            queryClient.invalidateQueries({ queryKey: ["person-faces", id] });
            queryClient.invalidateQueries({ queryKey: ["person-poses", id] });
            toast.success("Enrollment complete");
          }}
        />
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="border-gv-border bg-gv-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Reset enrollment</DialogTitle>
            <DialogDescription className="text-gv-muted">
              Delete all enrolled face images and embeddings for{" "}
              <span className="font-medium text-foreground">{person.fullName}</span>. The person
              record is kept — you can re-enroll immediately after.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={resetFacesMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetFacesMutation.mutate()}
              disabled={resetFacesMutation.isPending}
              className="gap-1.5"
            >
              {resetFacesMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Reset enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-gv-border bg-gv-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit person</DialogTitle>
            <DialogDescription className="text-gv-muted">
              Update name and department details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs text-gv-muted">Full name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-gv-border bg-gv-bg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dept" className="text-xs text-gv-muted">Department</Label>
              <Input
                id="edit-dept"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                className="border-gv-border bg-gv-bg text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate({ fullName: editName, department: editDept })}
              disabled={editMutation.isPending || !editName.trim()}
              className="gap-1.5"
            >
              {editMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gv-border bg-gv-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Delete person</DialogTitle>
            <DialogDescription className="text-gv-muted">
              Permanently delete{" "}
              <span className="font-medium text-foreground">{person.fullName}</span> and all
              associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-xs text-gv-muted">
            {[
              "Face embeddings and enrolled images",
              "Profile picture",
              "Gate event links (events preserved as unknown)",
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-500/60" />
                {text}
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
