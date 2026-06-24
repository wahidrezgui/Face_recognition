"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmployeePreview,
  fetchUnimportedEmployeeIds,
  importEmployees,
  type EmployeePreviewItem,
  type ImportResultItem,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, XCircle, Loader2, ImageOff, Image } from "lucide-react";

type State = "idle" | "previewing" | "ready" | "importing" | "done";

interface ResultMap {
  [mysqlId: number]: ImportResultItem & { importing?: boolean };
}

const PAGE_SIZE = 50;
const BATCH = 100;

export function SyncEmployeesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>("idle");
  const [employees, setEmployees] = useState<EmployeePreviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [alreadyImported, setAlreadyImported] = useState(0);
  const [offset, setOffset] = useState(0);
  const [enrollPhotos, setEnrollPhotos] = useState(false);
  const [resultMap, setResultMap] = useState<ResultMap>({});
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{
    imported: number; skipped: number; failed: number; enrolledFaces: number;
  } | null>(null);

  const loadPreview = useCallback(async (nextOffset = 0, append = false) => {
    setState("previewing");
    try {
      let offset = nextOffset;
      let data = await fetchEmployeePreview(PAGE_SIZE, offset, true);

      // skipImported can return an empty page when every row in the slice is already imported
      while (data.employees.length === 0 && offset + PAGE_SIZE < data.total) {
        offset += PAGE_SIZE;
        data = await fetchEmployeePreview(PAGE_SIZE, offset, true);
      }

      setTotal(data.total);
      setAlreadyImported(data.alreadyImported);
      setOffset(offset);
      if (append) {
        setEmployees(prev => [...prev, ...data.employees]);
      } else {
        setEmployees(data.employees);
      }
      setState("ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load employees");
      setState("idle");
    }
  }, []);

  useEffect(() => {
    if (open && state === "idle") {
      loadPreview(0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleOpen(v: boolean) {
    if (!v) {
      setState("idle");
      setEmployees([]);
      setResultMap({});
      setSummary(null);
      setOffset(0);
      setImportProgress(null);
    }
    onOpenChange(v);
  }

  async function runImport(ids: number[]) {
    let totalImported = 0, totalSkipped = 0, totalFailed = 0, totalEnrolled = 0;

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      try {
        const result = await importEmployees(batch, enrollPhotos);
        totalImported += result.imported;
        totalSkipped += result.skipped;
        totalFailed += result.failed;
        totalEnrolled += result.enrolledFaces;

        setResultMap(prev => {
          const next = { ...prev };
          result.results.forEach(r => { next[r.mysqlId] = r; });
          return next;
        });
        setImportProgress({ current: Math.min(i + BATCH, ids.length), total: ids.length });
      } catch {
        batch.forEach(id => {
          setResultMap(prev => ({
            ...prev,
            [id]: { mysqlId: id, status: "failed", error: "Batch request failed" },
          }));
        });
        totalFailed += batch.length;
        setImportProgress(prev => prev ? { ...prev, current: Math.min(prev.current + BATCH, ids.length) } : null);
      }
    }

    setSummary({ imported: totalImported, skipped: totalSkipped, failed: totalFailed, enrolledFaces: totalEnrolled });
    setState("done");
    queryClient.invalidateQueries({ queryKey: ["persons"] });
  }

  async function handleImportLoaded() {
    const ids = employees.filter(e => !e.isAlreadyImported).map(e => e.mysqlId);
    if (ids.length === 0) { toast.info("No new employees to import."); return; }

    setState("importing");
    setImportProgress({ current: 0, total: ids.length });
    const initialMap: ResultMap = {};
    ids.forEach(id => { initialMap[id] = { mysqlId: id, status: "imported", importing: true }; });
    setResultMap(initialMap);

    await runImport(ids);
  }

  async function handleImportAll() {
    const allNewCount = total - alreadyImported;
    if (allNewCount === 0) { toast.info("No new employees to import."); return; }

    setState("importing");
    setImportProgress({ current: 0, total: allNewCount });

    try {
      const { ids } = await fetchUnimportedEmployeeIds();
      if (ids.length === 0) {
        toast.info("No new employees to import.");
        setState("ready");
        setImportProgress(null);
        return;
      }
      setImportProgress({ current: 0, total: ids.length });
      await runImport(ids);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch employee IDs");
      setState("ready");
      setImportProgress(null);
    }
  }

  const newLoadedCount = employees.filter(e => !e.isAlreadyImported).length;
  const allNewCount = total - alreadyImported;
  const isLoading = state === "previewing";
  const isImporting = state === "importing";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sync from HR System</DialogTitle>
        </DialogHeader>

        {/* Stats bar */}
        {(state === "ready" || state === "importing" || state === "done") && (
          <div className="flex flex-wrap gap-3 rounded-lg border border-gv-border bg-gv-panel px-4 py-2.5 text-xs text-gv-muted">
            <span>Total in HR: <strong className="text-gray-200">{total}</strong></span>
            <span>Already imported: <strong className="text-gray-200">{alreadyImported}</strong></span>
            <span>New to import: <strong className="text-blue-300">{allNewCount}</strong></span>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gv-muted" />
            <span className="ml-2 text-sm text-gv-muted">Loading employees…</span>
          </div>
        )}

        {/* Import progress */}
        {isImporting && importProgress && (
          <div className="flex items-center gap-2 rounded-lg border border-gv-border bg-gv-panel px-4 py-3 text-sm text-gv-muted">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span>
              Importing <strong className="text-gray-200">{importProgress.current}</strong> / {importProgress.total}…
            </span>
          </div>
        )}

        {/* Summary after done */}
        {state === "done" && summary && (
          <div className="rounded-lg border border-gv-border bg-gv-panel p-4 text-sm">
            <p className="mb-2 font-medium text-gray-100">Import complete</p>
            <div className="flex flex-wrap gap-4 text-gv-muted">
              <span className="text-green-400">✓ {summary.imported} imported</span>
              {summary.enrolledFaces > 0 && (
                <span className="text-blue-400">🎭 {summary.enrolledFaces} faces enrolled</span>
              )}
              {summary.skipped > 0 && <span>{summary.skipped} skipped</span>}
              {summary.failed > 0 && <span className="text-red-400">✗ {summary.failed} failed</span>}
            </div>
          </div>
        )}

        {/* Employee list */}
        {(state === "ready" || state === "importing" || state === "done") && employees.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 py-1">
              {employees.map(emp => {
                const res = resultMap[emp.mysqlId];
                return (
                  <div
                    key={emp.mysqlId}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                      emp.isAlreadyImported
                        ? "opacity-40"
                        : "border border-gv-border bg-gv-panel"
                    )}
                  >
                    {emp.photoPath && !emp.photoPath.includes("nopic") ? (
                      <Image className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    ) : (
                      <ImageOff className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-100">{emp.fullName}</p>
                      {emp.fullNameAr && emp.fullNameAr !== emp.fullName && (
                        <p className="truncate text-[11px] text-gv-muted" dir="rtl">{emp.fullNameAr}</p>
                      )}
                    </div>

                    <span className="shrink-0 text-[11px] text-gv-muted">{emp.department}</span>

                    {emp.qrCode && (
                      <span className="shrink-0 font-mono text-[10px] text-gray-500">{emp.qrCode}</span>
                    )}

                    {emp.isAlreadyImported && (
                      <Badge variant="outline" className="shrink-0 border-gv-border text-[10px] text-gray-500">
                        imported
                      </Badge>
                    )}
                    {res?.importing && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-400" />
                    )}
                    {res && !res.importing && res.status === "imported" && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    )}
                    {res && res.status === "failed" && (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" aria-label={res.error ?? "Failed"} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {state === "ready" && offset + PAGE_SIZE < total && (
              <button
                type="button"
                onClick={() => loadPreview(offset + PAGE_SIZE, true)}
                className="mt-2 w-full py-2 text-xs text-gv-muted hover:text-gray-300"
              >
                Load more…
              </button>
            )}
          </div>
        )}

        {/* Empty state — only when there is genuinely nothing left to import */}
        {state === "ready" && employees.length === 0 && allNewCount === 0 && (
          <p className="py-10 text-center text-sm text-gv-muted">
            All employees have already been imported.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gv-muted">
            <input
              type="checkbox"
              checked={enrollPhotos}
              onChange={e => setEnrollPhotos(e.target.checked)}
              disabled={isImporting || state === "done"}
              className="accent-blue-500"
            />
            Enroll face photos
          </label>

          <div className="flex gap-2">
            {state === "done" ? (
              <Button onClick={() => handleOpen(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleOpen(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImportLoaded}
                  disabled={isLoading || isImporting || newLoadedCount === 0}
                >
                  Import loaded ({newLoadedCount})
                </Button>
                <Button
                  onClick={handleImportAll}
                  disabled={isLoading || isImporting || allNewCount === 0}
                  className="gap-2"
                >
                  {isImporting && importProgress ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {importProgress.current}/{importProgress.total}</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Import all ({allNewCount})</>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
