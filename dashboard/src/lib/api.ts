import { authHeaders, clearToken, getToken } from "./auth";

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
  }
  return res;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface GateEvent {
  eventId: string;
  personId: string | null;
  personName: string;
  confidence: number;
  timestamp: string;
  direction: "entry" | "exit";
  status?: "Identified" | "NeedsReview" | "Unrecognized";
  faceImageBase64?: string | null;
  faceImageUrl?: string | null;
  welcomeMessage?: string | null;
  department?: string | null;
}

export interface Person {
  id: string;
  fullName: string;
  department: string;
  enrollmentStatus: "Pending" | "Active" | "Revoked" | "Suspended";
  createdAt: string;
  faceCount: number;
  welcomeMessage?: string | null;
}

export async function fetchEvents(
  page = 1,
  limit = 50,
  name?: string,
  status?: string
): Promise<{ items: GateEvent[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set("name", name);
  if (status) params.set("status", status);
  const res = await apiFetch(`${API_BASE}/api/events?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchPersonsCount(): Promise<number> {
  const res = await apiFetch(`${API_BASE}/api/persons/count`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch persons count");
  const data = await res.json();
  return data.count;
}

export async function fetchPersons(): Promise<Person[]> {
  const res = await apiFetch(`${API_BASE}/api/persons`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch persons");
  return res.json();
}

export async function fetchPerson(id: string): Promise<Person> {
  const res = await apiFetch(`${API_BASE}/api/persons/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch person");
  return res.json();
}

export async function createPerson(fullName: string, department: string) {
  const res = await apiFetch(`${API_BASE}/api/persons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fullName, department }),
  });
  if (!res.ok) throw new Error("Failed to create person");
  return res.json();
}

export async function updateWelcomeMessage(id: string, welcomeMessage: string | null) {
  const res = await apiFetch(`${API_BASE}/api/persons/${id}/welcome-message`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ welcomeMessage }),
  });
  if (!res.ok) throw new Error("Failed to update welcome message");
  return res.json();
}

export async function updatePersonStatus(id: string, status: string) {
  const res = await apiFetch(`${API_BASE}/api/persons/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function enrollWithWebcam(
  personId: string,
  frames: string[]
) {
  const res = await fetch(`/vision/enroll/webcam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId, frames }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll via webcam";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchEventStats(): Promise<{
  todayEntries: number;
  pendingReview: number;
}> {
  const res = await apiFetch(`${API_BASE}/api/events/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch event stats");
  return res.json();
}

export async function deletePerson(personId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/persons/${personId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete person");
  return res.json();
}

export async function deleteEvent(eventId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/events/${eventId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete event");
  return res.json();
}

export async function enrollFaceFromBase64(personId: string, faceImageBase64: string): Promise<unknown> {
  const res = await fetch(`/vision/enroll/webcam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId, frames: [faceImageBase64, faceImageBase64, faceImageBase64] }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll face";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export interface EnrollWebcamResult {
  personId: string;
  accepted: number;
  rejected: { frame: number; reason: string }[];
  poses: string[];
}

/** Enroll with multiple distinct base64 frames (e.g. from webcam capture).
 *  Sends 3-20 frames to /vision/enroll/webcam for better enrollment quality.
 *  Returns per-frame pose labels detected server-side (frontal, left, right, up, down). */
/** Enroll with multiple distinct base64 frames from webcam.
 *  Pass replace=true to wipe previous embeddings before inserting (used when upgrading from
 *  a single gate-camera embedding to full multi-angle webcam enrollment). */
export async function enrollWithFrames(personId: string, frames: string[], replace = false): Promise<EnrollWebcamResult> {
  const res = await fetch(`/vision/enroll/webcam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId, frames: frames.slice(0, 20), replace }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll face";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

/** Enroll from a single gate-camera face crop (the faceImageBase64 stored in a GateEvent).
 *  Extracts one embedding server-side; no webcam required.
 *  The result can later be replaced by calling enrollWithFrames with replace=true. */
export async function enrollFromEventFace(personId: string, faceImageBase64: string): Promise<EnrollWebcamResult> {
  const res = await fetch(`/vision/enroll/from-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId, frame: faceImageBase64 }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll from event face";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function reviewEvent(eventId: string, personId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/events/${eventId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId }),
  });
  if (!res.ok) {
    let detail = "Failed to review event";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function enrollFromSystemCamera(
  personId: string
): Promise<{ personId: string; accepted: number; rejected: { attempt: number; reason: string }[]; backend_result: unknown }> {
  const res = await fetch(`/vision/enroll/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId }),
  });
  if (!res.ok) {
    let detail = "System camera enrollment failed";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export interface FaceImage {
  id: string;
  imageUrl: string;
}

export async function fetchPersonFaces(personId: string): Promise<FaceImage[]> {
  const res = await apiFetch(`${API_BASE}/api/persons/${personId}/faces`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch person faces");
  return res.json();
}

export async function uploadFace(
  personId: string,
  file: File
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`${API_BASE}/api/persons/${personId}/upload-face`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    let detail = "Failed to upload face image";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function detectPose(
  frame: string
): Promise<{ detected: boolean; yaw: number; pitch: number }> {
  try {
    const res = await fetch(`/vision/pose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frame }),
    });
    if (!res.ok) return { detected: false, yaw: 0, pitch: 0 };
    return res.json();
  } catch {
    return { detected: false, yaw: 0, pitch: 0 };
  }
}

export interface PoseEntry {
  pose: "frontal" | "left" | "right" | "up" | "down";
  enrolledAt: string;
}

export async function fetchPersonPoses(personId: string): Promise<PoseEntry[]> {
  const res = await apiFetch(`${API_BASE}/api/persons/${personId}/poses`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

const ALL_POSES = ["frontal", "left", "right", "up", "down"] as const;

/** Compute enrollment completion from a list of enrolled poses. */
export function poseCompletion(poses: PoseEntry[]): {
  enrolled: string[];
  missing: string[];
  percent: number;
} {
  const enrolled = ALL_POSES.filter((p) => poses.some((e) => e.pose === p));
  const missing = ALL_POSES.filter((p) => !enrolled.includes(p));
  const percent = Math.round((enrolled.length / ALL_POSES.length) * 100);
  return { enrolled, missing, percent };
}

export interface Roi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamStatus {
  roi: Roi;
  frame_size: { width: number; height: number };
  camera_open: boolean;
  detector_loaded: boolean;
  capture_interval_ms: number;
}

export async function fetchStreamStatus(): Promise<StreamStatus> {
  const res = await fetch("/vision/stream/status");
  if (!res.ok) return { roi: { x: 0, y: 0, width: 0, height: 0 }, frame_size: { width: 0, height: 0 }, camera_open: false, detector_loaded: false, capture_interval_ms: 500 };
  return res.json();
}

export async function setVideoSource(cameraSource: string, direction?: string): Promise<{ status: string; message?: string; camera_source: string; direction?: string }> {
  const res = await apiFetch(`${API_BASE}/api/config/video-source`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ cameraSource, direction }),
  });
  if (!res.ok) {
    let detail = "Failed to set video source";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function setRoi(roi: Roi): Promise<void> {
  await fetch("/vision/roi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roi),
  });
}

export function createEventStream(
  onEvent: (event: GateEvent) => void,
  onError?: (err: Event) => void,
  onOpen?: () => void
): EventSource {
  const token = getToken();
  const url = token ? `${API_BASE}/api/events/stream?token=${encodeURIComponent(token)}` : `${API_BASE}/api/events/stream`;
  const es = new EventSource(url);
  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data) as GateEvent;
      onEvent(data);
    } catch {
      // skip parse errors
    }
  };
  if (onError) es.onerror = onError;
  if (onOpen) es.onopen = onOpen;
  return es;
}
