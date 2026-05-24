"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { fetchPersons, createPerson, type Person } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusBadgeClass } from "@/lib/person-status";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_FILTERS = ["All", "Active", "Pending", "Suspended"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function PersonAvatar({ personId, fullName }: { personId: string; fullName: string }) {
  const [error, setError] = useState(false);
  const url = `${API_BASE}/api/persons/${personId}/profile-image`;
  if (error) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gv-border bg-gv-panel text-gray-500">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={fullName}
      onError={() => setError(true)}
      className="h-10 w-10 shrink-0 rounded-full border border-gv-border object-cover"
    />
  );
}

export default function PersonsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
  });

  const filtered = useMemo(() => {
    return persons.filter((p: Person) => {
      const matchesSearch =
        !search || p.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || p.enrollmentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [persons, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () => createPerson(name, dept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setName("");
      setDept("");
      toast.success("Person created");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to create person"),
  });

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col bg-gv-bg">
      <PageHeader
        title="Persons"
        subtitle={isLoading ? "—" : `${persons.length} enrolled`}
      />

      <div className="mx-auto w-full max-w-4xl flex-1 p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "border border-blue-600/40 bg-blue-700/30 text-blue-300"
                  : "border border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 border-gv-border bg-gv-panel"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mb-8 flex flex-col gap-3 sm:flex-row"
        >
          <Input
            className="flex-1 border-gv-border bg-gv-panel"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            className="w-full border-gv-border bg-gv-panel sm:w-40"
            placeholder="Department"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            required
          />
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding…" : "Add person"}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-lg bg-gv-panel" />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {!isLoading &&
            filtered.map((person: Person) => (
              <Link
                key={person.id}
                href={`/persons/${person.id}`}
                className="flex items-center gap-3 rounded-lg border border-gv-border bg-gv-panel px-4 py-3 transition hover:border-gv-muted/50 hover:bg-[#0d1a2f]"
              >
                <PersonAvatar personId={person.id} fullName={person.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-100">{person.fullName}</p>
                  <p className="truncate text-sm text-gv-muted">{person.department}</p>
                </div>
                {person.faceCount > 0 && (
                  <Badge variant="outline" className="shrink-0 border-gv-border text-[10px] text-gray-400">
                    {person.faceCount} face{person.faceCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                <span
                  className={cn(
                    "shrink-0 rounded border px-2 py-1 text-xs",
                    statusBadgeClass(person.enrollmentStatus),
                  )}
                >
                  {person.enrollmentStatus}
                </span>
              </Link>
            ))}
          {!isLoading && filtered.length === 0 && (
            <p className="py-8 text-center text-gv-muted">
              {search || statusFilter !== "All"
                ? "No persons match your filters."
                : "No persons registered."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
