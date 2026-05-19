"use client";

import { useState } from "react";
import { type GateEvent } from "@/lib/api";

export function FacePhoto({
  event,
  size = "w-14 h-14",
  textSize = "text-base",
}: {
  event: GateEvent;
  size?: string;
  textSize?: string;
}) {
  const [err, setErr] = useState(false);
  const src = event.faceImageBase64
    ? `data:image/jpeg;base64,${event.faceImageBase64}`
    : event.faceImageUrl ?? null;

  const initials =
    event.personName && event.personName !== "UNKNOWN"
      ? event.personName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  if (src && !err) {
    return (
      <img
        src={src}
        alt={event.personName}
        onError={() => setErr(true)}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full bg-[#1a2b3c] flex items-center justify-center`}
    >
      <span className={`${textSize} font-bold text-white/80`}>{initials}</span>
    </div>
  );
}
