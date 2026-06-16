"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bulkEnrollProfiles,
  fetchPersonsPaged,
  fetchAdminGates,
  type BulkEnrollResult,
  type BulkEnrollResultItem,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, SkipForward, Loader2, ScanFace } from "lucide-react";

export function BulkEnrollDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<BulkEnrollResult | null>(null);

  const { data: pendingData } = useQuery({
    queryKey: ["persons-pending-count"],
    queryFn: () => fetchPersonsPaged({ status: "Pending", pageSize: 200 }),
    enabled: open,
  });

  const { data: gates = [] } = useQuery({
    queryKey: ["admin-gates"],
    queryFn: fetchAdminGates,
    staleTime: 60_000,
    enabled: open,
  });

  const pendingWithImage = pendingData?.items.filter((p) => p.hasProfileImage) ?? [];
  const pendingTotal = pendingData?.total ?? 0;
  const gate = gates[0];

  const enrollMutation = useMutation({
    mutationFn: () => bulkEnrollProfiles(gate?.id),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      if (data.enrolled > 0) {
        toast.success(`${data.enrolled} person${data.enrolled !== 1 ? "s" : ""} enrolled successfully`);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Enrollment failed");
    },
  });

  function handleClose(open: boolean) {
    if (!enrollMutation.isPending) {
      if (!open) {
        setResult(null);
        enrollMutation.reset();
      }
      onOpenChange(open);
    }
  }

  const isRunning = enrollMutation.isPending;
  const isDone = result !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-blue-400" />
            Enroll Faces
          </DialogTitle>
        </DialogHeader>

        {!isDone && !isRunning && (
          <div className="space-y-4">
            {!gate ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-sm text-amber-300">
                No gate configured. Add a gate in Settings before enrolling.
              </p>
            ) : (
              <>
                <p className="text-sm text-gv-muted">
                  This will automatically enroll all pending persons who have a profile image
                  uploaded. Faces will be processed by the AI service and added to the recognition
                  database.
                </p>
                <div className="rounded-lg border border-gv-border bg-gv-panel p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Pending persons</span>
                    <span className="font-medium text-gray-100">{pendingTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">With profile image (ready to enroll)</span>
                    <span className="font-medium text-green-400">{pendingWithImage.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Without profile image (will be skipped)</span>
                    <span className="font-medium text-gray-500">
                      {pendingTotal - pendingWithImage.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-gv-border">
                    <span className="text-gray-400">Gate</span>
                    <span className="text-gray-300">{gate.name}</span>
                  </div>
                </div>
                {pendingWithImage.length === 0 && (
                  <p className="text-sm text-amber-400">
                    No pending persons with profile images found. Upload photos to persons first.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {isRunning && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <div className="text-center">
              <p className="font-medium text-gray-100">Enrolling faces…</p>
              <p className="text-sm text-gv-muted mt-1">
                Processing {pendingWithImage.length} person{pendingWithImage.length !== 1 ? "s" : ""}.
                This may take a moment.
              </p>
            </div>
          </div>
        )}

        {isDone && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-500/30 bg-green-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{result.enrolled}</p>
                <p className="text-xs text-gray-400 mt-0.5">Enrolled</p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-gray-400 mt-0.5">Failed</p>
              </div>
              <div className="rounded-lg border border-gv-border bg-gv-panel p-3 text-center">
                <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-xs text-gray-400 mt-0.5">Skipped</p>
              </div>
            </div>

            {result.results.length > 0 && (result.failed > 0 || result.enrolled > 0) && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gv-border divide-y divide-gv-border">
                {result.results
                  .filter((r) => r.status !== "skipped")
                  .map((r) => (
                    <ResultRow key={r.personId} item={r} />
                  ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter showCloseButton>
          {!isDone && (
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={isRunning || !gate || pendingWithImage.length === 0}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enrolling…
                </>
              ) : (
                <>
                  <ScanFace className="h-4 w-4" />
                  Enroll {pendingWithImage.length} face{pendingWithImage.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ item }: { item: BulkEnrollResultItem }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {item.status === "enrolled" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
      ) : item.status === "failed" ? (
        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <SkipForward className="h-4 w-4 shrink-0 text-gray-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", item.status === "enrolled" ? "text-gray-200" : "text-gray-400")}>
          {item.fullName}
        </p>
        {item.error && (
          <p className="truncate text-xs text-red-400">{item.error}</p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 text-xs",
          item.status === "enrolled" ? "text-green-400" : "text-red-400"
        )}
      >
        {item.status}
      </span>
    </div>
  );
}
