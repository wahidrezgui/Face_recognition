import { authHeaders, clearToken, getToken } from "./auth";

let _redirectingToLogin = false;

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== "undefined") {
    const onLoginPage = window.location.pathname === "/login";
    if (!_redirectingToLogin && !onLoginPage) {
      _redirectingToLogin = true;
      clearToken();
      window.location.href = "/login";
    }
  }
  return res;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface GateEvent {
  eventId: string;
  gateId?: string;
  personId: string | null;
  personName: string;
  confidence: number;
  timestamp: string;
  status?: "Identified" | "NeedsReview";
  faceImageBase64?: string | null;
  faceImageUrl?: string | null;
  welcomeMessage?: string | null;
  department?: string | null;
  emotion?: string | null;
  age?: number | null;
  gender?: string | null;
}

export interface Person {
  id: string;
  fullName: string;
  enrollmentStatus: "Pending" | "Active" | "Suspended";
  faceCount: number;
  hasProfileImage?: boolean;
  welcomeMessage?: string | null;
  externalSourceId?: string | null;
  militaryNumber?: number | null;
}

export interface EmployeePreviewItem {
  mysqlId: number;
  fullName: string;
  fullNameAr?: string | null;
  department: string;
  qrCode?: string | null;
  photoPath?: string | null;
  isAlreadyImported: boolean;
  personId?: string | null;
}

export interface EmployeePreviewResult {
  total: number;
  alreadyImported: number;
  employees: EmployeePreviewItem[];
}

export interface ImportResultItem {
  mysqlId: number;
  status: "imported" | "skipped" | "failed";
  personId?: string | null;
  error?: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  enrolledFaces: number;
  results: ImportResultItem[];
}

export async function fetchEmployeePreview(
  limit = 50,
  offset = 0,
  skipImported = true,
): Promise<EmployeePreviewResult> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    skipImported: String(skipImported),
  });
  const res = await apiFetch(`${API_BASE}/api/v1/sync/employees?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch employee preview");
  return res.json();
}

export async function fetchUnimportedEmployeeIds(): Promise<{ ids: number[]; count: number }> {
  const res = await apiFetch(`${API_BASE}/api/v1/sync/employees/ids`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch employee IDs");
  return res.json();
}

export async function importEmployees(
  mysqlIds: number[],
  enrollPhotos: boolean,
): Promise<ImportResult> {
  const res = await apiFetch(`${API_BASE}/api/v1/sync/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ mysqlIds, enrollPhotos }),
  });
  if (!res.ok) throw new Error("Failed to import employees");
  return res.json();
}

export type EventActivityRange = "today" | "week" | "month";

export interface EventDayBucket {
  date: string;
  total: number;
  identified: number;
}

export interface EventHourBucket {
  hour: number;
  total: number;
}

export interface EventActivityStats {
  range: EventActivityRange;
  from: string;
  to: string;
  total: number;
  identified: number;
  needsReview: number;
  uniquePersons: number;
  avgConfidence: number;
  byDay: EventDayBucket[];
  byHour?: EventHourBucket[] | null;
}

/** Local calendar range bounds (converted to ISO UTC instants for API filters). */
export function activityRangeBounds(range: EventActivityRange): { from: string; to: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (range === "week") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);
    return { from: from.toISOString(), to: tomorrow.toISOString() };
  }
  if (range === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: tomorrow.toISOString() };
  }
  return { from: todayStart.toISOString(), to: tomorrow.toISOString() };
}

export async function fetchEventActivity(
  range: EventActivityRange,
  from?: string,
  to?: string,
  gateId?: string,
): Promise<EventActivityStats> {
  const params = new URLSearchParams({ range });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (gateId) params.set("gateId", gateId);
  params.set("tzOffset", String(new Date().getTimezoneOffset()));
  const res = await apiFetch(`${API_BASE}/api/v1/events/activity?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch event activity");
  return res.json();
}

export async function fetchEvents(
  page = 1,
  limit = 50,
  name?: string,
  status?: string,
  from?: string,
  to?: string,
  gateId?: string,
): Promise<{ items: GateEvent[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set("name", name);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (gateId) params.set("gateId", gateId);
  const res = await apiFetch(`${API_BASE}/api/v1/events?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchPersonsCount(): Promise<number> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/count`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch persons count");
  const data = await res.json();
  return data.count;
}

export async function fetchPersonIds(): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/ids`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch person ids");
  const data = await res.json();
  return data.ids ?? [];
}

export interface PersonsPage {
  items: Person[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchPersonsPaged(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
} = {}): Promise<PersonsPage> {
  const p = new URLSearchParams();
  if (params.page) p.set("page", String(params.page));
  if (params.pageSize) p.set("pageSize", String(params.pageSize));
  if (params.search) p.set("search", params.search);
  if (params.status && params.status !== "All") p.set("status", params.status);
  const res = await apiFetch(`${API_BASE}/api/v1/persons?${p}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch persons");
  return res.json();
}

export async function fetchPersons(): Promise<Person[]> {
  const data = await fetchPersonsPaged({ pageSize: 200 });
  return data.items;
}

export async function fetchPerson(id: string): Promise<Person> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch person");
  return res.json();
}

export async function createPerson(fullName: string, welcomeMessage?: string | null) {
  const res = await apiFetch(`${API_BASE}/api/v1/persons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fullName, welcomeMessage }),
  });
  if (!res.ok) throw new Error("Failed to create person");
  return res.json();
}

export async function updateWelcomeMessage(id: string, welcomeMessage: string | null) {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${id}/welcome-message`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ welcomeMessage }),
  });
  if (!res.ok) throw new Error("Failed to update welcome message");
  return res.json();
}

export async function updatePerson(id: string, data: { fullName?: string }) {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update person");
  return res.json();
}

export async function updatePersonStatus(id: string, status: string) {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function enrollWithWebcam(
  gateId: string,
  personId: string,
  frames: string[]
) {
  const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/enroll/webcam`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId, frames }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll via webcam";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchEventStats(): Promise<{
  todayEntries: number;
  pendingReview: number;
}> {
  const res = await apiFetch(`${API_BASE}/api/v1/events/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch event stats");
  return res.json();
}

export async function deletePerson(personId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete person");
  return res.json();
}

export interface BulkEnrollResultItem {
  personId: string;
  fullName: string;
  status: "enrolled" | "failed" | "skipped";
  error?: string | null;
}

export interface BulkEnrollResult {
  total: number;
  enrolled: number;
  failed: number;
  skipped: number;
  results: BulkEnrollResultItem[];
}

export async function bulkEnrollProfiles(gateId?: string): Promise<BulkEnrollResult> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/bulk-enroll-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ gateId: gateId ?? null }),
  });
  if (!res.ok) {
    let detail = "Bulk enrollment failed";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function deletePersonsBulk(ids: string[]): Promise<{ deleted: number }> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/bulk`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Bulk delete failed");
  return res.json();
}

export async function deleteEvent(eventId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/v1/events/${eventId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  // 404 = already deleted — treat as success
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete event");
  return res.status === 404 ? { status: "already_deleted" } : res.json();
}

export interface EnrollWebcamResult {
  personId: string;
  accepted: number;
  rejected: { frame: number; reason: string }[];
  poses: string[];
}

export async function enrollWithFrames(gateId: string, personId: string, frames: string[], replace = false): Promise<EnrollWebcamResult> {
  const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/enroll/webcam`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId, frames: frames.slice(0, 20), replace }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll face";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function enrollFromEventFace(gateId: string, personId: string, faceImageBase64: string): Promise<EnrollWebcamResult> {
  const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/enroll/from-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId, frame: faceImageBase64 }),
  });
  if (!res.ok) {
    let detail = "Failed to enroll from event face";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function reviewEvent(eventId: string, personId: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE}/api/v1/events/${eventId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId }),
  });
  if (!res.ok) {
    let detail = "Failed to review event";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function enrollFromSystemCamera(
  gateId: string,
  personId: string
): Promise<{ personId: string; accepted: number; rejected: { attempt: number; reason: string }[]; backend_result: unknown }> {
  const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/enroll/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId }),
  });
  if (!res.ok) {
    let detail = "System camera enrollment failed";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export interface FaceImage {
  id: string;
  imageUrl: string;
}

export async function fetchPersonFaces(personId: string): Promise<FaceImage[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}/faces`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch person faces");
  return res.json();
}

export async function fetchTrainingEvents(
  page = 1,
  limit = 50,
  name?: string,
  status?: string
): Promise<{ items: GateEvent[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set("name", name);
  if (status) params.set("status", status);
  const res = await apiFetch(`${API_BASE}/api/v1/training-events?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch training events");
  return res.json();
}

export async function updateTrainingEvent(eventId: string, data: {
  personId?: string | null;
  confidence: number;
  status: "NeedsReview" | "Identified";
  capturedAt: string;
  emotion?: string | null;
  age?: number | null;
  gender?: string | null;
}): Promise<GateEvent> {
  const res = await apiFetch(`${API_BASE}/api/v1/training-events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to update training event";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function deletePersonFace(personId: string, faceId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}/faces/${faceId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete face");
}

export async function resetPersonFaces(personId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}/faces`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to reset enrollment");
}

export async function uploadFace(
  personId: string,
  file: File
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}/upload-face`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    let detail = "Failed to upload face image";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function detectPose(
  gateId: string,
  frame: string
): Promise<{ detected: boolean; yaw: number; pitch: number }> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/pose`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
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
  const res = await apiFetch(`${API_BASE}/api/v1/persons/${personId}/poses`, { headers: authHeaders() });
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
}

export async function setVideoSource(cameraSource: string): Promise<{ status: string; message?: string; camera_source: string }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/video-source`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ cameraSource }),
  });
  if (!res.ok) {
    let detail = "Failed to set video source";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchLogUnknown(): Promise<{ enabled: boolean }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/log-unknown`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch log unknown setting");
  return res.json();
}

export async function setLogUnknown(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/log-unknown`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to set log unknown setting");
  return res.json();
}

export async function fetchTrainingMode(): Promise<{ enabled: boolean }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/training-mode`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch training mode");
  return res.json();
}

export async function setTrainingMode(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/training-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to set training mode");
  return res.json();
}


export interface GateStats {
  frames_captured: number;
  faces_detected: number;
  events_sent: number;
  backend_errors: number;
  circuit_open: boolean;
  windows_processed: number;
}

export interface GateStreamStatus {
  camera_open: boolean;
  detector_loaded: boolean;
  camera_source: string;
  processing_fps: number;
  stats: GateStats;
}

export interface GateStatus {
  id: string;
  name: string;
  pythonUrl: string | null;
  online: boolean;
  status: GateStreamStatus | null;
}

export async function fetchGates(): Promise<GateStatus[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/gates`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

/** Build gate-scoped desk URL and carry auth token for display tabs/devices. */
export function deskDisplayUrl(gateId: string): string {
  const token = getToken();
  const params = new URLSearchParams();
  params.set("gateId", gateId);
  if (token) params.set("token", token);
  const qs = params.toString();
  return `/desk?${qs}`;
}

/** Resolve the best stream URL for a gate — uses the backend proxy.
 *  Appends the JWT as ?token= so the auth middleware can authenticate <img> requests. */
export function gateStreamUrl(gateId: string): string {
  const token = getToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/api/v1/gates/${gateId}/stream${qs}`;
}

export async function fetchGateCameras(gateId: string): Promise<{ index: number; name: string }[]> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/cameras`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchGateProcessingFps(gateId: string): Promise<{ fps: number }> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/processing-fps`, { headers: authHeaders() });
    if (!res.ok) return { fps: 3 };
    return res.json();
  } catch {
    return { fps: 3 };
  }
}

export async function setGateProcessingFps(gateId: string, fps: number): Promise<{ fps: number }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/processing-fps`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fps }),
  });
  if (!res.ok) throw new Error("Failed to set processing FPS");
  return res.json();
}

export interface GateRecognitionConfig {
  min_match_score: number;
  identify_confidence_threshold: number;
  auto_validate_confidence: number;
  min_face_confidence: number;
  log_unknown?: boolean;
  training_mode?: boolean;
}

export async function setGateRecognitionConfig(
  gateId: string,
  config: GateRecognitionConfig
): Promise<{ status: string } & GateRecognitionConfig> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/recognition`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    // ASP.NET minimal APIs bind camelCase; GET responses use snake_case.
    body: JSON.stringify({
      identifyConfidenceThreshold: config.identify_confidence_threshold,
      minMatchScore: config.min_match_score,
      autoValidateConfidence: config.auto_validate_confidence,
      minFaceConfidence: config.min_face_confidence,
      logUnknown: config.log_unknown,
      trainingMode: config.training_mode,
    }),
  });
  if (!res.ok) throw new Error("Failed to set recognition thresholds");
  return res.json();
}

export interface HikvisionCameraEvent {
  timestamp: string;
  eventType: string;
  eventState: string;
  channelId: string;
  detectionTarget: string | null;
  qualified: boolean;
  reason: string | null;
}

export interface GateCameraEvents {
  enabled: boolean;
  connected: boolean;
  active: boolean;
  url: string | null;
  event_types: string;
  event_ttl_ms: number;
  detection_target: string;
  events: HikvisionCameraEvent[];
}

export async function fetchGateCameraEvents(gateId: string): Promise<GateCameraEvents | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/camera-events`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchGateStatus(gateId: string): Promise<GateStreamStatus | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/status`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface GateDbConfig {
  gate_id: string;
  camera_source: string;
  processing_fps: number;
  model_profile: string;
  detector_input_size: number[] | null;
  motion_threshold: number;
  motion_pixel_threshold: number;
  detect_max_width: number;
  hikvision_url: string;
  hikvision_user: string;
  hikvision_password: string;
  hikvision_event_ttl_ms: number;
  hikvision_event_types: string;
  hikvision_detection_target: string;
  min_match_score: number;
  identify_confidence_threshold: number;
  auto_validate_confidence: number;
  min_face_confidence: number;
  tracker_max_lost_s?: number;
  log_unknown?: boolean;
  training_mode?: boolean;
  welcome_cooldown_seconds?: number;
  buffer_track_expiry_seconds?: number;
  buffer_person_dedup_seconds?: number;
  refire_score_delta?: number;
  min_track_hits?: number;
  desk_display_seconds?: number;
  desk_event_lookback_seconds?: number;
  show_needs_review_on_desk?: boolean;
}

export interface GateDeskConfig {
  desk_display_seconds: number;
  desk_event_lookback_seconds: number;
  show_needs_review_on_desk: boolean;
}

export interface GateWelcomeWorkflowConfig {
  welcome_cooldown_seconds: number;
  buffer_track_expiry_seconds: number;
  buffer_person_dedup_seconds: number;
  refire_score_delta: number;
  min_track_hits: number;
  desk_display_seconds: number;
  desk_event_lookback_seconds: number;
  show_needs_review_on_desk: boolean;
}

export async function fetchGateDbConfig(gateId: string): Promise<GateDbConfig | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/gates/${gateId}/config`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchGateDeskConfig(gateId: string): Promise<GateDeskConfig> {
  const defaults: GateDeskConfig = {
    desk_display_seconds: 10,
    desk_event_lookback_seconds: 30,
    show_needs_review_on_desk: false,
  };
  try {
    const token = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      ?? localStorage.getItem("gv_token")
      : null;
    const params = token ? `?token=${encodeURIComponent(token)}` : "";
    const res = await fetch(`${API_BASE}/api/v1/config/gates/${gateId}/desk-settings${params}`);
    if (!res.ok) return defaults;
    return res.json();
  } catch {
    return defaults;
  }
}

export async function setGateWelcomeConfig(
  gateId: string,
  config: GateWelcomeWorkflowConfig,
): Promise<{ status: string } & GateWelcomeWorkflowConfig> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/welcome-workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      welcomeCooldownSeconds: config.welcome_cooldown_seconds,
      bufferTrackExpirySeconds: config.buffer_track_expiry_seconds,
      bufferPersonDedupSeconds: config.buffer_person_dedup_seconds,
      refireScoreDelta: config.refire_score_delta,
      minTrackHits: config.min_track_hits,
      deskDisplaySeconds: config.desk_display_seconds,
      deskEventLookbackSeconds: config.desk_event_lookback_seconds,
      showNeedsReviewOnDesk: config.show_needs_review_on_desk,
    }),
  });
  if (!res.ok) throw new Error("Failed to set welcome workflow config");
  return res.json();
}

export interface AdminGate {
  id: string;
  name: string;
  pythonUrl: string;
  apiKey: string | null;
  startCommand: string | null;
  createdAt: string;
}

export async function fetchAdminGates(): Promise<AdminGate[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/admin/gates`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch gates");
  return res.json();
}

export async function createGate(data: {
  name: string;
  pythonUrl: string;
  apiKey?: string;
  startCommand?: string;
}): Promise<AdminGate> {
  const res = await apiFetch(`${API_BASE}/api/v1/admin/gates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to create gate";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateGate(
  id: string,
  data: { name?: string; pythonUrl?: string; apiKey?: string | null; startCommand?: string | null }
): Promise<AdminGate> {
  const res = await apiFetch(`${API_BASE}/api/v1/admin/gates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to update gate";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function deleteGate(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/v1/admin/gates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete gate");
}

export async function stopGate(gateId: string): Promise<{ status: string }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/stop`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let detail = "Failed to stop gate";
    try { const b = await res.json(); if (b?.error || b?.detail) detail = b.error || b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function startGate(gateId: string): Promise<{ status: string; message?: string }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let detail = "Failed to start gate";
    try { const b = await res.json(); if (b?.error || b?.detail) detail = b.error || b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchGateKioskSettings(gateId: string): Promise<{ speechBuffered: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/config/gates/${gateId}/kiosk-settings`);
    if (!res.ok) return { speechBuffered: false };
    return res.json();
  } catch {
    return { speechBuffered: false };
  }
}

export async function setGateKioskSettings(
  gateId: string,
  settings: { speechBuffered: boolean },
): Promise<void> {
  await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/kiosk-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(settings),
  });
}

// ── Validated Events (Access Log) ─────────────────────────────────────────────

export interface ValidatedEvent {
  eventId: string;
  gateEventId: string | null;
  gateId: string;
  personId: string | null;
  personName: string;
  department: string | null;
  confidence: number;
  timestamp: string;
  validatedBy: "auto" | "manual";
  validatedAt: string;
  faceImageBase64?: string | null;
  emotion?: string | null;
  age?: number | null;
  gender?: string | null;
}

export async function fetchValidatedEvents(
  page = 1,
  limit = 50,
  name?: string,
  from?: string,
  to?: string,
  gateId?: string,
): Promise<{ items: ValidatedEvent[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set("name", name);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (gateId) params.set("gateId", gateId);
  const res = await apiFetch(`${API_BASE}/api/v1/validated-events?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch validated events");
  return res.json();
}

export async function validateGateEvent(
  eventId: string,
  personId?: string,
): Promise<{ validatedEventId: string; personName: string }> {
  const res = await apiFetch(`${API_BASE}/api/v1/events/${eventId}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ personId: personId ?? null }),
  });
  if (!res.ok) {
    let detail = "Failed to validate event";
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { }
    throw new Error(detail);
  }
  return res.json();
}

export async function deleteValidatedEvent(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/v1/validated-events/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete validated event");
}

export async function fetchValidatedEventStats(
  from?: string,
  to?: string,
  gateId?: string,
): Promise<{
  total: number;
  autoCount: number;
  manualCount: number;
}> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (gateId) params.set("gateId", gateId);
  const qs = params.toString();
  const res = await apiFetch(
    `${API_BASE}/api/v1/validated-events/stats${qs ? `?${qs}` : ""}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error("Failed to fetch validated event stats");
  return res.json();
}

export async function setGateVideoSource(
  gateId: string,
  cameraSource: string,
): Promise<{ status: string; gate_id: string; camera_source: string; message?: string }> {
  const res = await apiFetch(`${API_BASE}/api/v1/config/gates/${gateId}/video-source`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ cameraSource }),
  });
  if (!res.ok) {
    let detail = "Failed to set video source";
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { }
    throw new Error(detail);
  }
  return res.json();
}
