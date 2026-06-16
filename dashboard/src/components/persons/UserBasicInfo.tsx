"use client";

import { Camera, Loader2, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusBadgeClass } from "@/lib/person-status";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/api";

interface PoseCompletion {
  percent: number;
  enrolled: string[];
}

interface UserBasicInfoProps {
  person: Person;
  profileImageUrl: string;
  profileError: boolean;
  onProfileError: () => void;
  uploading: boolean;
  onUploadClick: () => void;
  comp: PoseCompletion;
  onEditClick: () => void;
}

export function UserBasicInfo({
  person,
  profileImageUrl,
  profileError,
  onProfileError,
  uploading,
  onUploadClick,
  comp,
  onEditClick,
}: UserBasicInfoProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {/* Avatar */}
      <div className="relative shrink-0 self-center sm:self-start">
        {profileError || !person.hasProfileImage ? (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gv-border bg-gv-panel text-gv-muted">
            <User className="size-10 opacity-50" />
          </div>
        ) : (
          <img
            src={profileImageUrl}
            alt={person.fullName}
            onError={onProfileError}
            className="h-28 w-28 rounded-full border-2 border-gv-border object-cover shadow-lg shadow-black/30"
          />
        )}
        <Button
          type="button"
          size="icon"
          className="absolute -bottom-1 -right-1 size-9 rounded-full border-2 border-gv-bg bg-emerald-700 hover:bg-emerald-600"
          onClick={onUploadClick}
          disabled={uploading}
          title="Upload profile picture"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
        </Button>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <h1 className="font-display text-xl font-semibold tracking-wide text-white sm:text-2xl">
            {person.fullName}
          </h1>
          <button
            onClick={onEditClick}
            className="inline-flex size-7 items-center justify-center rounded-md text-gv-muted transition-colors hover:bg-gv-panel hover:text-white"
            title="Edit person"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>

        <p className="mt-1 text-sm text-gv-muted">{person.department}</p>

        {person.militaryNumber != null && (
          <p className="mt-0.5 text-xs font-mono text-gv-muted">
            Mil #{person.militaryNumber}
          </p>
        )}

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
  );
}
