"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { fetchPersonsPaged, createPerson, uploadFace, enrollFromEventFace, deletePersonsBulk, fetchAdminGates, type Person } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { statusBadgeClass } from "@/lib/person-status";
import { cn } from "@/lib/utils";
import { UserPlus, Camera, RefreshCw, ChevronLeft, ChevronRight, Trash2, ScanFace } from "lucide-react";
import { SyncEmployeesDialog } from "./components/SyncEmployeesDialog";
import { BulkEnrollDialog } from "./components/BulkEnrollDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const PAGE_SIZE = 50;

/** Resizes and converts any image file to a raw base64 JPEG string (no data-URL prefix). */
function fileToBase64Jpeg(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.92).replace(/^data:[^;]+;base64,/, ""));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

const STATUS_FILTERS = ["All", "Active", "Pending", "Suspended"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PersonAvatar = memo(function PersonAvatar({
  personId,
  fullName,
  hasProfileImage,
}: {
  personId: string;
  fullName: string;
  hasProfileImage?: boolean;
}) {
  const [error, setError] = useState(false);
  const url = `${API_BASE}/api/v1/persons/${personId}/profile-image`;
  const fallback = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gv-border bg-gv-panel text-gray-500">
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </div>
  );
  if (!hasProfileImage || error) return fallback;
  return (
    <img
      src={url}
      alt={fullName}
      onError={() => setError(true)}
      className="h-10 w-10 shrink-0 rounded-full border border-gv-border object-cover"
    />
  );
}, (prev, next) => prev.personId === next.personId && prev.hasProfileImage === next.hasProfileImage);

export default function PersonsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Debounce search input — 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page and selection when status filter changes
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [statusFilter]);

  // Clear selection when page changes
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ["persons", page, PAGE_SIZE, debouncedSearch, statusFilter],
    queryFn: () => fetchPersonsPaged({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter !== "All" ? statusFilter : undefined,
    }),
  });

  const { data: adminGates = [] } = useQuery({
    queryKey: ["admin-gates"],
    queryFn: fetchAdminGates,
    staleTime: 60_000,
  });

  const persons = data?.items ?? [];

  const isAllSelected = persons.length > 0 && persons.every((p: Person) => selectedIds.has(p.id));
  const isIndeterminate = !isAllSelected && persons.some((p: Person) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(persons.map((p: Person) => p.id)));
    }
  }, [isAllSelected, persons]);

  const bulkDeleteMutation = useMutation({
    mutationFn: () => deletePersonsBulk(Array.from(selectedIds)),
    onSuccess: ({ deleted }) => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      toast.success(`${deleted} person${deleted !== 1 ? "s" : ""} deleted`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    },
  });

  function resetModal() {
    setName("");
    setImageFile(null);
    setImagePreview(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const person = await createPerson(name);
      if (!imageFile) return { hadImage: false, enrollError: null };

      const b64 = await fileToBase64Jpeg(imageFile);
      const firstGateId = adminGates[0]?.id ?? "";
      const [, enrollResult] = await Promise.allSettled([
        uploadFace(person.id, imageFile),
        firstGateId ? enrollFromEventFace(firstGateId, person.id, b64) : Promise.reject(new Error("No gate configured")),
      ]);

      const enrollError =
        enrollResult.status === "rejected"
          ? enrollResult.reason instanceof Error
            ? enrollResult.reason.message
            : "Face enrollment failed"
          : null;

      return { hadImage: true, enrollError };
    },
    onSuccess: ({ hadImage, enrollError }) => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      resetModal();
      setModalOpen(false);
      if (enrollError) {
        toast.warning(`Person created. Could not enroll face: ${enrollError}`);
      } else {
        toast.success(hadImage ? "Person created and face enrolled" : "Person created");
      }
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to create person"
      ),
  });

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
      <PageHeader
        title="Persons"
        subtitle={isLoading ? "—" : `${data?.total ?? 0} enrolled`}
      />

      <div className="mx-auto w-full max-w-4xl flex-1 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "border border-blue-600/40 bg-blue-700/30 text-blue-300"
                    : "border border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSyncOpen(true)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync from HR
            </Button>
            <Button variant="outline" onClick={() => setEnrollOpen(true)} className="gap-2 border-blue-500/40 text-blue-300 hover:bg-blue-900/20 hover:text-blue-200">
              <ScanFace className="h-4 w-4" />
              Enroll Faces
            </Button>
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add person
            </Button>
          </div>
        </div>

        <Input
          placeholder="Search by name or mil #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 border-gv-border bg-gv-panel"
        />

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-gv-border bg-gv-panel px-4 py-2.5">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-gray-600 accent-blue-500"
              />
              <span className="text-sm text-gray-300">
                {selectedIds.size} selected
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[68px] w-full rounded-lg bg-gv-panel"
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {!isLoading &&
            persons.map((person: Person) => {
              const isSelected = selectedIds.has(person.id);
              return (
                <div
                  key={person.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-gv-panel px-4 py-3 transition hover:bg-[#0d1a2f]",
                    isSelected
                      ? "border-blue-500/40 bg-blue-950/20"
                      : "border-gv-border hover:border-gv-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(person.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-600 accent-blue-500"
                  />
                  <Link
                    href={`/persons/${person.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <PersonAvatar
                      personId={person.id}
                      fullName={person.fullName}
                      hasProfileImage={person.hasProfileImage}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-100">
                        {person.fullName}
                      </p>
                      {person.militaryNumber != null && (
                        <p className="truncate text-sm text-gv-muted">
                          Mil #{person.militaryNumber}
                        </p>
                      )}
                    </div>
                    {person.faceCount > 0 && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-gv-border text-[10px] text-gray-400"
                      >
                        {person.faceCount} face{person.faceCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <span
                      className={cn(
                        "shrink-0 rounded border px-2 py-1 text-xs",
                        statusBadgeClass(person.enrollmentStatus)
                      )}
                    >
                      {person.enrollmentStatus}
                    </span>
                  </Link>
                </div>
              );
            })}
          {!isLoading && persons.length === 0 && (
            <p className="py-8 text-center text-gv-muted">
              {debouncedSearch || statusFilter !== "All"
                ? "No persons match your filters."
                : "No persons registered."}
            </p>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1 || isLoading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-gv-muted">
              Page <strong className="text-gray-300">{page}</strong> of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= data.totalPages || isLoading}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <SyncEmployeesDialog open={syncOpen} onOpenChange={setSyncOpen} />
      <BulkEnrollDialog open={enrollOpen} onOpenChange={setEnrollOpen} />

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} person{selectedIds.size !== 1 ? "s" : ""}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gv-muted">
            This will permanently delete the selected{" "}
            {selectedIds.size === 1 ? "person" : `${selectedIds.size} persons`} along with
            all their face embeddings and enrolled images. Gate events will be preserved
            as unlinked records.
          </p>
          <p className="text-sm font-medium text-red-400">This action cannot be undone.</p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate()}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedIds.size} person${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add person dialog */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) resetModal();
          setModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add person</DialogTitle>
          </DialogHeader>

          <form
            id="add-person-form"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            {/* Photo picker */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gv-border bg-gv-panel transition hover:border-blue-500/60 hover:bg-[#0d1a2f]"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-500 group-hover:text-gray-300">
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px]">Add photo</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <p className="text-center text-[11px] text-gv-muted">
                {imageFile
                  ? "Face will be detected and enrolled automatically"
                  : "Optional — photo will be processed for face recognition"}
              </p>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Remove photo
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-person-name">Full Name</Label>
              <Input
                id="add-person-name"
                className="border-gv-border bg-gv-panel"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </form>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              form="add-person-form"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding…" : "Add person"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
