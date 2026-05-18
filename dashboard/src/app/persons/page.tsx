"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { fetchPersons, createPerson, type Person } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function statusBadge(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-900 text-emerald-300";
    case "Pending":
      return "bg-amber-900 text-amber-300";
    case "Revoked":
    case "Suspended":
      return "bg-red-900 text-red-300";
    default:
      return "bg-gray-800 text-gray-300";
  }
}

function PersonAvatar({ personId, fullName }: { personId: string; fullName: string }) {
  const [error, setError] = useState(false);
  const url = `${API_BASE}/api/persons/${personId}/profile-image`;
  if (error) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    );
  }
  return (
    <img src={url} alt={fullName} onError={() => setError(true)}
      className="w-10 h-10 rounded-full object-cover border border-gray-700 shrink-0" />
  );
}

export default function PersonsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [search, setSearch] = useState("");

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["persons"],
    queryFn: fetchPersons,
  });

  const filtered = persons.filter((p: Person) =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: () => createPerson(name, dept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setName("");
      setDept("");
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Persons</h1>

      <input
        placeholder="Search by name..."
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="flex gap-3 mb-8"
      >
        <input
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex-1"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-40"
          placeholder="Department"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "..." : "Add"}
        </button>
      </form>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-2">
        {filtered.map((person: Person) => (
          <Link
            key={person.id}
            href={`/persons/${person.id}`}
            className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition"
          >
            <PersonAvatar personId={person.id} fullName={person.fullName} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{person.fullName}</p>
              <p className="text-sm text-gray-400 truncate">{person.department}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${statusBadge(person.enrollmentStatus)}`}
            >
              {person.enrollmentStatus}
            </span>
          </Link>
        ))}
        {filtered.length === 0 && !isLoading && (
          <p className="text-gray-500 text-center py-8">
            {search ? "No persons match your search." : "No persons registered."}
          </p>
        )}
      </div>
    </div>
  );
}
