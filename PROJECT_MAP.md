# Identity Verification System - PROJECT_MAP

## [TECH_STACK]

### GateVision AI Microservice (Python)
- FastAPI, port 8000
- InsightFace (SCRFD + ArcFace) with ONNX Runtime (GPU when available, CPU fallback), OpenCV
- httpx for async HTTP to .NET backend (circuit breaker: 5 failures → OPEN, 30s reset)
- pydantic-settings (GV_ prefix)
- Package structure: `pyproject.toml`, relative imports (`from .quality import ...`)

### GateVision .NET Backend
- .NET 10, ASP.NET Core Minimal API, port 5000
- Qdrant.Client for vector ANN search (cosine distance, gRPC port 6334)
- EF Core for Person + GateEvent + TrainingEvent entities
- Redis caching (localhost:6379)
- SSE at `/api/events/stream`
- **Authentication:** JWT bearer + `AuthMiddleware` class (`Infrastructure/Middleware/AuthMiddleware.cs`)
  - JWT from `Authorization: Bearer` header (standard)
  - JWT from `?token=` query param via `JwtBearerEvents.OnMessageReceived` (for SSE)
  - API key from `X-API-Key` header, `?token=`, or `?api_key=` query params
  - `ILogger<AuthMiddleware>` logs auth successes (Debug) and failures (Information)
- **Login:** `POST /api/auth/login` returns JWT from API key

### Dashboard
- Next.js 15 App Router, TanStack Query, Tailwind CSS
- Pages: `/login`, `/dashboard`, `/persons`, `/persons/[id]`, `/events`, `/training-events`, `/config`
- Auth: login page at `/login`, JWT stored in localStorage, sent as Bearer token

---

## [SYSTEM_FLOW]

```
┌─────────┐    ┌──────────────────────────┐  X-API-Key   ┌──────────────────┐  Bearer JWT  ┌─────────────┐
│ Camera  │───▶│ GateVision AI            │─────────────▶│ GateVision .NET  │◄────────────│  Dashboard  │
│ (USB/   │    │ (Python/FastAPI)         │ POST /identify│ (Minimal API)    │ /api/auth/  │  (Next.js)  │
│  RTSP)  │    │  port 8000               │ POST /enroll  │  port 5000       │ login→JWT   │  port 3000  │
└─────────┘    └──────────────────────────┘               └──────────────────┘             └─────────────┘
                     │                                            │                               │
               RTSP/USB capture                        POST /api/identify                  SSE live feed
               SCRFD face detection                    Qdrant ANN search                   person mgmt
               ArcFace embedding (512-dim)             cosine sim + threshold              event history
               quality filter (yaw/pitch/size)         persist to gate_events              training events
               250 ms interaction window               EventBufferService dedup            JWT auth
               IdentityScheduler (≤3/window)           Redis person cache                  config page
               POST embedding to .NET                  SSE push (GateEventChannel)
               circuit breaker (5 fail → OPEN)        training_events (when mode ON)

               ┌─────────────────────────────────────────────────────────────────────────┐
               │ Authentication Flow                                                      │
               │                                                                          │
               │ Python → .NET:    X-API-Key header (GV_NET_API_KEY)                     │
               │ Dashboard → .NET: Bearer JWT (from /api/auth/login)                     │
               │ SSE:              ?token= query param (API key or JWT)                  │
               │ Exempt:           /api/health                                            │
               └─────────────────────────────────────────────────────────────────────────┘
```

### Responsibilities

| Component | Owns |
|-----------|------|
| GateVision AI | RTSP/USB capture, SCRFD detection, ArcFace embeddings, quality filtering, 250 ms interaction windows, bbox-IoU tracking, HTTP POST to .NET |
| GateVision .NET | Identity matching (Qdrant), event persistence, EventBufferService dedup by track_id, Redis cache, SSE push, JWT + API key auth, training mode |
| Dashboard | Login, live SSE feed, person management, face enrollment (webcam guided), event history, training event review, config page |

---

## [API_CONTRACTS]

### AI → .NET: Identify (requires X-API-Key or Bearer JWT)
```json
POST /api/identify
{
  "embedding":    [0.123, -0.442, ...],   // 512-dim ArcFace vector
  "frameQuality": 0.91,
  "capturedAt":   "2026-05-10T10:22:12Z",
  "direction":    "entry",
  "faceCrop":     "<base64-jpeg>",         // face region crop
  "trackId":      182,                     // assigned by Python bbox-IoU tracker
  "age":          32,
  "gender":       "Male",
  "emotion":      null
}
→ {
  "eventId":    "uuid",
  "personId":   "guid",
  "personName": "John Doe",
  "confidence": 0.95,
  "status":     "Identified",
  "timestamp":  "...",
  "direction":  "entry"
}
```

### AI → .NET: Enroll (requires X-API-Key or Bearer JWT)
```json
POST /api/persons/{id}/enroll
{
  "embeddings":   [[0.123, ...], ...],     // one or more 512-dim vectors
  "faceImages":   ["<base64-jpeg>", ...],  // optional face crops per embedding
  "poses":        ["frontal", "left"],     // optional pose labels
  "replace":      false                    // true = wipe old embeddings first
}
→ 200 OK
```

### Dashboard → .NET: Login (no auth required)
```json
POST /api/auth/login
{ "apiKey": "dev-api-key-change-me" }
→ { "token": "eyJhbGciOiJIUzI1NiIs..." }
```

### .NET → Dashboard: SSE Event Stream
```
GET /api/events/stream?token=<JWT_or_API_key>
data: {
  "eventId":       "uuid",
  "personId":      "guid",
  "personName":    "John Doe",
  "confidence":    0.92,
  "status":        "Identified",
  "timestamp":     "...",
  "direction":     "entry",
  "faceImageBase64": "<base64-jpeg>"
}
```

### Live Camera Stream
```
GET /stream → port 8000 (MJPEG from GateVision AI)
Proxied via dashboard/next.config.js: /stream → localhost:8000/stream
```

### Confidence Thresholds (IdentificationService)

| Range | Status | Behaviour |
|-------|--------|-----------|
| ≥ 0.80 | Identified | Persisted to `gate_events`; SSE published; person greeting shown |
| 0.35–0.79 | NeedsReview | Persisted to `training_events` (training mode ON only); SSE published for kiosk display |
| < 0.35 | Unrecognized | Not persisted; SSE published for kiosk display only; null PersonId |

---

### GateVision .NET Endpoints (port 5000)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/identify` | JWT/API Key | Identify person by embedding. Buffers in `EventBufferService` keyed by `(track_id)`. Highest-confidence detection per track saved to `gate_events` on track expiry (3s idle). Rate-limited 10 req/s. |
| `GET /api/events` | JWT/API Key | Paginated gate events with name ILIKE + status filter |
| `GET /api/events/stats` | JWT/API Key | Today entries, pending review count |
| `GET /api/events/activity` | JWT/API Key | Activity trends over range (today/week/month) with hourly/daily buckets |
| `DELETE /api/events/{id}` | JWT/API Key | Delete a gate event |
| `POST /api/events/{id}/review` | JWT/API Key | Link unidentified event to a person (sets PersonId, status → Identified) |
| `GET /api/events/stream` | Token (qs) | SSE real-time stream (`?token=` accepts API key or JWT) |
| `GET /api/training-events` | JWT/API Key | Paginated training events (sub-threshold captures stored when training mode ON) |
| `DELETE /api/training-events/{id}` | JWT/API Key | Delete a training event |
| `POST /api/auth/login` | None | Exchange API key for JWT |
| `GET /api/health` | None | Health check (pings DB + reports status) |
| `GET /api/persons` | JWT/API Key | List all enrolled persons |
| `POST /api/persons` | JWT/API Key | Create person |
| `GET /api/persons/{id}` | JWT/API Key | Get person details |
| `DELETE /api/persons/{id}` | JWT/API Key | Delete person, face embeddings, profile images; nullify gate event links |
| `PATCH /api/persons/{id}/status` | JWT/API Key | Update enrollment status (Pending/Active/Revoked/Suspended) |
| `POST /api/persons/{id}/enroll` | JWT/API Key | Store face embeddings; face images saved to `FaceImages/{personId}/` as files |
| `GET /api/persons/{id}/faces` | JWT/API Key | Enrolled face image URLs |
| `GET /api/persons/{id}/face-image/{faceId}` | JWT/API Key | Serve enrolled face image file (path traversal protected) |
| `POST /api/persons/{id}/upload-face` | JWT/API Key | Upload profile picture (multipart, .jpg/.jpeg/.png) |
| `GET /api/persons/{id}/profile-image` | JWT/API Key | Serve uploaded profile picture |
| `GET /api/persons/{id}/poses` | JWT/API Key | Enrolled pose angles (frontal/left/right/up/down) |
| `GET /api/config/training-mode` | JWT/API Key | Check if training mode enabled |
| `POST /api/config/training-mode` | JWT/API Key | Toggle training mode (stores sub-threshold events as training_events) |
| `GET /api/config/log-unknown` | JWT/API Key | Check if unknown face logging enabled |
| `POST /api/config/log-unknown` | JWT/API Key | Toggle unknown face logging |
| `POST /api/config/video-source` | JWT/API Key | Set camera source + direction. Writes `config/video_source.json`, POSTs to Python `/restart`, polls `/health` up to 10×300ms |
| `GET /api/admin/gates` | JWT/API Key | List all gates (id, name, pythonUrl, apiKey, createdAt) |
| `POST /api/admin/gates` | JWT/API Key | Create a new gate (id, name, pythonUrl, apiKey) |
| `PATCH /api/admin/gates/{id}` | JWT/API Key | Update gate name, pythonUrl, or apiKey |
| `DELETE /api/admin/gates/{id}` | JWT/API Key | Delete a gate |

### GateVision AI Endpoints (port 8000)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (camera open, detector loaded, stats) |
| `GET /stream` | MJPEG camera stream (lazy JPEG encode — only when clients connected) |
| `GET /stream/status` | Stream status: camera, detector, window settings, fps, direction, ROI, stats |
| `GET /events/recent` | Last 20 events log `{timestamp, confidence, personName}` |
| `GET /cameras` | Probe indices 0–9; return available cameras with friendly names (Windows: WMI query) |
| `POST /identify` | Identify face from pre-extracted embedding |
| `POST /enroll` | Enroll face from raw frame arrays |
| `POST /enroll/capture` | Capture & enroll from system camera (exclusive access) |
| `POST /enroll/webcam` | Enroll from browser webcam (3–20 base64 frames, multi-pose) |
| `POST /enroll/from-image` | Enroll from single base64 face crop (adds padding + upscale for detector robustness) |
| `POST /pose` | Estimate head pose (yaw/pitch) from base64 frame |
| `POST /restart` | Swap camera source: warm-up test frame before swap, atomic config write, returns 502 if no frames |
| `POST /roi` | Set Region of Interest `{x, y, width, height}` (0 = full frame) |
| `GET /config/processing-fps` | Return current processing FPS |
| `POST /config/processing-fps` | Set processing FPS (1–30); persists to `config/python_settings.json` |

---

## [GATEVISION SYSTEM DETAILS]

### GateVision AI Microservice (`gate_vision_ai/`)

Two sample edge-node configurations are provided at `run-gate-a.sh` and `run-gate-b.sh` in the project root. Each sets the required `GV_*` env vars and starts the service on its own port (8000 / 8001). Source config files are in `gate_vision_ai/env/`.

| File | Role |
|------|------|
| `main.py` | FastAPI lifespan, **event-window-driven** capture loop. Detected faces fed to `_window_manager.collect()`; when 250 ms window expires, `_window_manager.finalize()` produces a frozen `InteractionSnapshot` and `_process_snapshot()` is dispatched as an asyncio task. Assigns `track_id` per face via bbox-IoU tracker (`_bbox_iou`, `_match_or_create_track`, 3s track expiry). State dict for route closures. Contains `_drain_loop()` background task that replays buffered events every 10s. |
| `window.py` | **InteractionWindowManager**: collects detections over a fixed window, deduplicates by `track_id` (highest confidence wins), locks ordering at `finalize()`. **IdentityScheduler**: resolves at most `max_identity_requests_per_window` identities per snapshot in rank order with `greeting_delay_ms` sleep between each. Data classes: `InteractionSnapshot`, `SnapshotPerson`, `IdentityResult`. |
| `capture.py` | OpenCV video source (USB device index, RTSP URL, or file). Exponential backoff reconnect on failure. Graceful `_stopped` flag for shutdown. |
| `detector.py` | InsightFace SCRFD detector wrapper. Returns per-face: bbox, confidence, landmarks, 512-dim embedding, pose (pitch/yaw/roll), age, gender. |
| `embedder.py` | ArcFace 512-dim extraction. `average_embeddings()` for weighted multi-angle enrollment. |
| `quality.py` | Pose estimation from 5-point landmarks (yaw/pitch). Quality check: confidence ≥ 0.5, bbox ≥ 40px, yaw ≤ 30°. `crop_face_b64()` for face region extraction. |
| `processing.py` | `process_single_face()`: quality check → embedding → face crop → POST to .NET `/api/identify`. Auto-improvement: if 0.55 < confidence < 0.85, async silent re-enroll (300s cooldown per person). |
| `client.py` | `NetBackendClient`: httpx async client with circuit breaker (CLOSED/OPEN/HALF_OPEN, 5-failure threshold, 30s reset). `identify()` and `enroll()` methods. Sends `gate_id` in payload. Buffers events locally via `LocalEventBuffer` when backend unreachable. `drain_local_buffer()` replays buffered events on recovery. |
| `local_buffer.py` | `LocalEventBuffer`: SQLite-backed event queue. `enqueue()`, `dequeue_batch()`, `pending_count()`. Thread-safe via `threading.Lock`. Activates when circuit breaker is OPEN or backend unreachable. |
| `config.py` | pydantic-settings, prefix `GV_`. All tunable parameters including `gate_id`, `local_buffer_path`, window settings. |
| `routes.py` | All route handlers via `register_routes(app, state)` pattern. Exposes `GET /metrics` (Prometheus) and `GET /api/gates` proxy. |
| `__main__.py` | `uvicorn.run("gate_vision_ai.main:app")` entry point. Supports `GV_PORT` env var (default 8000). |
| `env/gate-a.env` | Sample env config for Gate A edge node — webcam index 1, port 8000 |
| `env/gate-b.env` | Sample env config for Gate B edge node — sample1.mp4, port 8001 |

**Interaction state machine:**

| State | Meaning |
|-------|---------|
| DETECTED | Bbox seen for first time |
| STABILIZING | Inside 250 ms collection window |
| CONFIRMED | Window closed, track survived dedup |
| SCHEDULED | Slot reserved in identity queue |
| GREETED | Identity resolved, result emitted |
| COOLDOWN | Suppress re-greeting same person |

**Stats tracked in `_stats`, exposed via `/stream/status`:**
- `frames_captured`, `faces_detected`, `events_sent`, `backend_errors`, `circuit_open`, `windows_processed`

---

### GateVision .NET Backend (`GateVision.Api/`)

| Component | Role |
|-----------|------|
| `Endpoints/IdentifyEndpoints.cs` | Accepts embedding + metadata. Calls `IdentificationService`. Routes result through `EventBufferService`. SSE-publishes every detection for real-time display. Rate-limited 10 req/s. |
| `Endpoints/EventEndpoints.cs` | REST event queries (paginated, filtered). SSE endpoint with heartbeat backoff (5s → 30s). Training events endpoint. |
| `Endpoints/PersonEndpoints.cs` | Person CRUD. Face enrollment. Face image serving (path traversal protected). Profile picture upload. |
| `Endpoints/ConfigEndpoints.cs` | Training mode toggle. Unknown logging toggle. Video source redirect to Python. |
| `Services/IdentificationService.cs` | Qdrant ANN search (cosine, min score 0.35). Redis person cache. Threshold: ≥ 0.80 → Identified, else → NeedsReview. |
| `Services/EventBufferService.cs` | `ConcurrentDictionary<int, BufferedTrack>` keyed by `track_id`. `BufferOrUpdate()` keeps highest-confidence detection per track. Background `FlushExpiredAsync()` (1s interval, 3s expiry): Identified → `gate_events`; NeedsReview/Unrecognized → `training_events` (training mode ON only). |
| `Services/GateEventChannel.cs` | `GateChannelRegistry` — `ConcurrentDictionary<string, Channel<GateEvent>>` with `"_all"` aggregate channel. Singleton, replaces static singleton. `Publish(gateId, evt)` writes to per-gate + `"_all"` channels. |
| `Services/CacheService.cs` | Redis key `person:{id}` → `(Name, Department, WelcomeMessage)`. Gracefully degrades if Redis unavailable. |
| `Services/EnrollmentService.cs` | Stores embeddings in Qdrant with per-pose tags. Face crops saved to `FaceImages/{personId}/{embeddingId}.jpg`. |
| `Services/TrainingModeService.cs` | Boolean flag. When ON: sub-threshold events persist as `training_events`. |
| `Services/GateService.cs` | Singleton. Loads gates from the `gates` DB table with a 60s in-memory cache. Exposes `GetAllAsync`, `GetByIdAsync`, `InvalidateCache`. Used by `AuthMiddleware` (per-gate API key lookup) and all gate config endpoints. |
| `Infrastructure/Middleware/AuthMiddleware.cs` | Validates JWT Bearer and X-API-Key. Per-gate API keys are resolved from `GateService` (DB-backed, cached). `?token=` param accepted for SSE. |
| `Db/Scripts/` | 15 DbUp migrations (001–015). Runs automatically on startup. |

**Database tables:** `persons`, `gate_events`, `training_events`, `gates`
**Vector store:** Qdrant collection `face_embeddings`, 512-dim, cosine distance

---

### GateVision Dashboard (`dashboard/`)

| Component | Role |
|-----------|------|
| `app/dashboard/page.tsx` | Live feed: SSE events deduplicated by `eventId` or `personId+5s window`. Face Captures strip (all detections). Target Analysis sidebar (matched persons only). ROI editor (drag-to-resize, persisted to localStorage). |
| `app/desk/page.tsx` | Gate kiosk display. Real-time identification card with auto-dismiss (10s). SSE-driven, push-only. |
| `app/events/page.tsx` | Paginated event log. Name ILIKE + status filter. Activity chart. SSE invalidates query cache. |
| `app/training-events/page.tsx` | Training mode event log. Review/link events to persons. |
| `app/persons/page.tsx` + `app/persons/[id]/page.tsx` | Person CRUD. Webcam-guided enrollment (5 poses, countdown). Profile picture upload. Face image gallery. |
| `app/config/page.tsx` | Video source switcher (webcam/file/RTSP). Training mode + unknown logging toggles. Processing FPS slider. |
| `app/gates/page.tsx` | Gate status dashboard + management. Create, edit (name/URL/API key), and delete gates. Auto-refreshes every 15s. |
| `hooks/useGateEventStream.ts` | `EventSource` wrapper. Auto-resolves JWT token. Parses SSE messages as `GateEvent`. Optional event filter. |
| `lib/api.ts` | Typed fetch functions for all .NET endpoints. |
| `components/ReviewEventModal.tsx` | Link/create/delete person from an unidentified event. Inline face enrollment from event crop. |

---

## [ORPHANS & PENDING]

| ID | Gap | Priority | Status |
|----|-----|----------|--------|
| H2 | **`CapturedAt` uses `DateTime.Parse`** — 500 on malformed input in `IdentifyEndpoints.cs` | 🟠 HIGH | ✅ FIXED — replaced with `DateTime.TryParse`, returns 400 on bad input |
| H3 | **`FaceImageBase64` stored as TEXT in `gate_events`** — large column; should be a file-based URL like enrolled faces | 🟠 HIGH | ⏳ DEFERRED — requires schema change, not a blocker |
| H4 | **No rate limiting on enrollment endpoints** — `/api/persons/{id}/enroll` and `/enroll/webcam` are unthrottled | 🟠 HIGH | ✅ FIXED — added `EnrollPolicy` (5 req/s) in `Program.cs`, applied to enroll endpoint |
| H5 | **Redis no auth** in `docker-compose.yml` — open on `localhost:6379` | 🟠 HIGH | ✅ FIXED — added `requirepass` + `REDIS_PASSWORD` env var; connection string updated |
| M1 | **Stats query full table scan** — `GET /api/events/stats` counts without index | 🟡 MEDIUM | ✅ FIXED — added `idx_gate_events_captured_at` index in migration 014 |
| M2 | **Missing DB indexes** on `gate_events(CapturedAt)`, `gate_events(Status)`, `persons(FullName)` | 🟡 MEDIUM | ✅ FIXED — migration `014_AddIndexes.sql` adds all three |
| M5 | **Unbounded `gate_events` growth** — no TTL, archival, or row limit policy | 🟡 MEDIUM | ✅ FIXED — background cleanup task deletes events older than 90 days (hourly check) |
| D2 | **Dead component: `StatCard.tsx`** — imported nowhere | 🟡 MEDIUM | ✅ FIXED — file removed |
| D3 | **Module-level `_track_best_conf` dict in `main.py`** — replaced by `InteractionWindowManager` dedup in `window.py` | 🟡 MEDIUM | ✅ FIXED — removed; window manager handles per-track highest-confidence selection |

### Architecture Rules (enforced)
- Python is the **only** component touching OpenCV, InsightFace, or any CV/ML library
- Python → .NET data: `{ embedding, frameQuality, capturedAt, direction, faceCrop, trackId, age, gender, emotion }`
- Python sends `X-API-Key` header for auth
- .NET → Dashboard data: `{ eventId, personId, personName, confidence, status, timestamp, direction, faceImageBase64 }`
- .NET backend never imports any vision library
- Dashboard users authenticate via `/api/auth/login` → JWT → Bearer header
- SSE `?token=` query param accepts both JWT and API key

---

## [FUTURE ENHANCEMENTS]

All phases from **ROAD_MAP.md Part II** are now **VERIFIED**:
- ✅ Phase 1 (G82–G84): GateId domain foundation — `gate_id` threaded through Python, .NET, PostgreSQL, and SSE
- ✅ Phase 2 (G85–G89): Gate-scoped SSE channels, per-gate kiosk display, per-gate API keys, multi-gate dashboard selector
- ✅ Phase 3 (G90–G92): Edge resilience (SQLite local buffer) + drain loop + Prometheus `/metrics`
- ✅ Phase 4 (G93–G95): nginx reverse proxy, edge Dockerfile, multi-origin CORS

Remaining future items (not yet planned):
- Face liveness detection — requires additional sensors or anti-spoofing model
- Mask detection — requires model retraining
- Emotion recognition — requires expression model

---

## [MILESTONES]

| ID | Goal | Status |
|----|------|--------|
| G1 | GateVision AI Service | ✅ VERIFIED |
| G2 | GateVision .NET Backend | ✅ VERIFIED |
| G3 | GateVision Dashboard | ✅ VERIFIED |
| G4 | Docker: Redis + PostgreSQL | ✅ VERIFIED |
| G5 | Live camera stream on dashboard | ✅ VERIFIED |
| G6 | Webcam enrollment with head-pose guidance | ✅ VERIFIED |
| G7 | Event filters (name ILIKE + status) | ✅ VERIFIED |
| G8 | Alerts page real-time SSE | ✅ VERIFIED |
| G9 | Circuit breaker — Python→.NET, 5-failure threshold, 30s reset | ✅ ADDED v3 |
| G10 | JWT + API key auth on all endpoints except health | ✅ ADDED v3 |
| G11 | Credential leak fixed — no hardcoded DB passwords in source | ✅ ADDED v3 |
| G12 | DevExceptionPage gated behind IsDevelopment() | ✅ ADDED v3 |
| G13 | Channel-based SSE push — replaced DB polling with Channel\<T\> | ✅ ADDED v4 |
| G14 | Shared `process_single_face()` extracted to `processing.py` | ✅ ADDED v4 |
| G17 | SSE `?token=` query string auth (API key + JWT) | ✅ ADDED v4 |
| G18 | User Secrets + `.env.example` templates; `.env` deleted | ✅ ADDED v4 |
| G19 | Circuit breaker `open_count` metric + state transition logging | ✅ ADDED v4 |
| G20 | Stats query: three COUNTs merged into single GroupBy | ✅ ADDED v4 |
| G21 | Cosine similarity via EF Core (removed legacy Dapper queries) | ✅ ADDED v4 |
| G22 | CancellationToken on all EF Core async calls | ✅ ADDED v4 |
| G23 | `apiFetch` clears token on 401, redirects to `/login` | ✅ ADDED v4 |
| G24 | `/api/health` pings DB connectivity | ✅ ADDED v4 |
| G25 | Root page redirects unauthenticated users to `/login` | ✅ ADDED v4 |
| G26 | Logout button on all protected pages | ✅ ADDED v4 |
| G27 | Seed SQL fixed (`ARRAY_AGG` instead of broken `string_join`) | ✅ ADDED v4 |
| G28 | Webcam enroll capped at 20 frames | ✅ ADDED v4 |
| G29 | `quality.py` clean import — removed try/except fallback | ✅ ADDED v4 |
| G30 | Removed unused `next-intl` and `lucide-react` dependencies | ✅ ADDED v4 |
| G31 | Redis error catch now logs instead of swallowing silently | ✅ ADDED v4 |
| G32 | SSE and event list send `faceImageUrl` instead of base64 blob | ✅ ADDED v4 |
| G33 | Webcam enrollment refactored: `CaptureRing.tsx` + `usePoseDetection` hook extracted | ✅ ADDED v4 |
| G34 | Rate limiting on `POST /api/identify` — 10 req/s fixed window | ✅ ADDED v4 |
| G35 | `.env` deleted; `.env.example` templates in place | ✅ ADDED v4 |
| G36 | Face crops saved to `FaceImages/{personId}/` files on enroll | ✅ ADDED v5 |
| G37 | `GET /api/persons/{id}/faces` returns enrolled face image URLs | ✅ ADDED v5 |
| G38 | Confidence < 0.35 → Unrecognized (null PersonId); no random-person display | ✅ ADDED v5 |
| G39 | Identify stores face crop as `FaceImageBase64` in `gate_events` | ✅ ADDED v5 |
| G40 | Unrecognized events not persisted to DB; SSE-only for kiosk display | ✅ ADDED v5 |
| G41 | Dashboard: Face Captures strip shows all detections; Target Analysis shows matched only | ✅ VERIFIED v5 |
| G42 | `/events` page created — name ILIKE + status filter, pagination | ✅ VERIFIED v6 |
| G43 | Schema drift fixed — orphaned migration files deleted | ✅ VERIFIED v6 |
| G44 | Camera source resolution order: file path → RTSP URL → device index | ✅ VERIFIED v6 |
| G45 | SSE heartbeat with activity backoff (5s → 30s, resets on event) | ✅ VERIFIED v6 |
| G46 | SSE error state on dashboard — `onError` sets `streamError`; `onOpen` resets | ✅ VERIFIED v6 |
| G47 | Dashboard empty-state guidance when no persons enrolled / awaiting detections | ✅ VERIFIED v6 |
| G48 | Debug `console.log` removed from dashboard | ✅ VERIFIED v6 |
| G51 | `Program.cs` throws `InvalidOperationException` if `Auth:JwtSecret` or `Auth:ApiKey` absent | ✅ FIXED v6 |
| G52 | `.env` with hardcoded API key deleted; `.env.example` created | ✅ FIXED v6 |
| G53 | Seed SQL excluded from DbUp auto-migration (`!s.Contains("Seed")` filter) | ✅ FIXED v6 |
| G54 | Path traversal in image serving fixed — `Path.GetFullPath` + `StartsWith(ImageDir)` check | ✅ FIXED v6 |
| G55 | CORS locked to explicit origins — `WithOrigins("http://localhost:3000")` | ✅ FIXED v6 |
| G56 | Configurable ROI via `GV_ROI_*` env vars or `POST /roi`. Detection limited to ROI; green overlay on MJPEG | ✅ ADDED v6 |
| G57 | SSE publishes all detections including unknowns (Face Captures strip) | ✅ FIXED v6 |
| G59 | Interactive ROI editor on dashboard — drag/resize handles, persisted to localStorage | ✅ ADDED v6 |
| G60 | Enrolled face images saved as files; `FaceImage` column stores relative path | ✅ ADDED v7 |
| G61 | Profile picture upload — `POST /api/persons/{id}/upload-face`, served via profile-image endpoint | ✅ ADDED v7 |
| G62 | Dashboard sidebar dedup: same personId within 5s updates in-place instead of appending | ✅ ADDED v8 |
| G63 | `AuthMiddleware` extracted from `Program.cs`; `?token=` validates both API key and JWT | ✅ ADDED v9 |
| G64 | Config page: video source switcher (webcam/file/RTSP); source passed in POST body; atomic config write; warm-up frame; health poll | ✅ ADDED v10/v12 |
| G66 | `EventBufferService` — buffers by `track_id`, highest-confidence per track, 3s expiry flush | ✅ ADDED v11 |
| G70 | Redis: 3 keys → 1 combined key `person:{id}` (Name + Department + WelcomeMessage) | ✅ ADDED v12 |
| G71 | SSE: `setQueryData` prepends events directly; background refresh debounced 2s | ✅ ADDED v12 |
| G72 | `React.memo` on `EventCard` + `CaptureThumb` with `eventId`+`confidence` comparator | ✅ ADDED v12 |
| G73 | Lazy JPEG encode — only when `stream_connections > 0` | ✅ ADDED v12 |
| G74 | Interaction-window config knobs: `window_duration_ms=250`, `max_identity_requests_per_window=3`, `greeting_delay_ms=300` | ✅ ADDED v14 |
| G75 | `InteractionWindowManager` — 250 ms window, dedup by `track_id`, frozen snapshot at `finalize()` | ✅ ADDED v14 |
| G76 | `IdentityScheduler` — ≤ `max_identity_requests_per_window` per snapshot, rank-ordered, `greeting_delay_ms` pacing | ✅ ADDED v14 |
| G77 | `_capture_loop()` rewired to event-window model; removed `_track_best_conf` | ✅ ADDED v14 |
| G78 | Interaction metrics in `/stream/status`: window settings + `windows_processed` counter | ✅ ADDED v14 |
| G79 | Dual-table schema: `gate_events` (7 cols, PersonName populated at read-time via JOIN); `training_events` for sub-threshold captures when training mode ON | ✅ ADDED v15 |
| G80 | Configurable processing FPS (`GV_PROCESSING_FPS`, default 3); `POST /config/processing-fps` persists to `python_settings.json`; detection rate independent of MJPEG preview | ✅ ADDED v16 |
| G81 | Multi-track bbox-IoU tracker (`_match_or_create_track`, IoU ≥ 0.15, 3s expiry); desk page `activePersonIdRef` dedup — same personId updates confidence silently | ✅ ADDED v17 |
| G82 | `gate_id` in Python config (`GV_GATE_ID`, default `"default"`) + outbound identify payload | ✅ ADDED v18 |
| G83 | `GateId` property on .NET `IdentifyRequestDto`; threaded through `BufferedTrack`, `GateEvent`; SSE payload includes `gateId` | ✅ ADDED v18 |
| G84 | DB migration `013_AddGateId.sql` — `ALTER TABLE` on `gate_events` and `training_events`; `AppDbContext` config; composite `TrackKey(GateId, TrackId)` for `EventBufferService` dedup | ✅ ADDED v18 |
| G85 | `GateChannelRegistry` — `ConcurrentDictionary<string, Channel<GateEvent>>` with `"_all"` aggregate channel; replaces static `GateEventChannel` | ✅ ADDED v18 |
| G86 | Gate-scoped SSE: `GET /api/events/stream/{gateId}` + `GET /api/gates` endpoints; existing `/stream` reads `"_all"` aggregate | ✅ ADDED v18 |
| G87 | `useGateEventStream` hook accepts optional `gateId` param; `/desk` and `/kiosk` read `?gateId=` from URL query string | ✅ ADDED v18 |
| G88 | Per-gate API keys (`Auth:GateApiKeys` map); `AuthMiddleware` injects `GateId` claim on gate key auth; identify handler enforces `authenticatedGateId == dto.GateId` (403 on mismatch) | ✅ ADDED v18 |
| G89 | Multi-gate gate selector in admin dashboard — `fetchGates` API call; dynamic gate list; filters SSE stream to selected gate | ✅ ADDED v18 |
| G90 | `LocalEventBuffer` (SQLite-backed) in `local_buffer.py`; on circuit open / backend down → enqueue; `drain_local_buffer()` replays with `replayed=true` flag | ✅ ADDED v18 |
| G91 | `_drain_loop()` in `main.py` (10s interval, CLOSED circuit only); .NET `IdentifyRequestDto.Replayed` skips SSE publish for replayed events | ✅ ADDED v18 |
| G92 | `GET /metrics` Prometheus endpoint in `routes.py` — per-gate counters (frames, faces, events, errors, circuit state, buffer pending, windows processed) | ✅ ADDED v18 |
| G93 | `nginx/nginx.conf` with SSE-safe config (`proxy_buffering off`, `proxy_read_timeout 3600s`), SSL termination, reverse proxy for .NET API, Python AI, and dashboard | ✅ ADDED v18 |
| G94 | `gate_vision_ai/Dockerfile` (Python 3.11-slim); edge node templates in `docker-compose.yml` (`gate-a`, `gate-b`); nginx service | ✅ ADDED v18 |
| G95 | Multi-origin CORS config — `Cors:AllowedOrigins` reads from `appsettings.json` instead of hardcoded `localhost:3000` | ✅ ADDED v18 |
| G96 | Gates moved to DB — `gates` table (migration 015); `GateService` singleton with 60s cache; `AuthMiddleware` reads gate API keys from DB; admin CRUD via `/api/admin/gates`; dashboard Gates page adds create/edit/delete UI; `Gates` + `GateApiKeys` config sections removed | ✅ ADDED v19 |

---

## [CONFIGURATION]

### .NET `appsettings.Development.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=6667;Database=gatevision;Username=gatevision;Password=localdev",
    "Redis": "localhost:6379"
  },
  "Auth": {
    "JwtSecret": "dev-secret-key-32-chars-min!!",
    "ApiKey": "dev-api-key-change-me"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```
**Gates are now stored in the `gates` DB table** (migration `015_AddGatesTable.sql`). Seed data for `gate-a` and `gate-b` is inserted by the migration. Manage gates via `GET/POST/PATCH/DELETE /api/admin/gates` or from the dashboard Gates page. No `Gates` or `Auth:GateApiKeys` config sections required.

Production: override via `appsettings.json` with empty strings + User Secrets or environment variables.

### .NET Environment Variable Overrides
```
ConnectionStrings__DefaultConnection   DB connection string
ConnectionStrings__Redis               Redis connection string
Auth__JwtSecret                        JWT signing key (min 32 chars)
Auth__ApiKey                           Shared API key
```

### Python Environment Variables (`GV_` prefix)

| Variable | Default | Description |
|----------|---------|-------------|
| `GV_CAMERA_SOURCE` | `"0"` | Camera source: device index, RTSP URL, or file path. Overridden by `config/video_source.json` if present |
| `GV_PROCESSING_FPS` | `3` | Face detection rate in fps. Overridden by `config/python_settings.json` if present |
| `GV_DIRECTION` | `"entry"` | Gate direction: `"entry"` or `"exit"` |
| `GV_GATE_ID` | `"default"` | Gate identifier for multi-gate deployments |
| `GV_LOCAL_BUFFER_PATH` | `"gate_events_local.db"` | Path to SQLite file for local event buffering on outage |
| `GV_WINDOW_DURATION_MS` | `250` | Interaction window collection duration (ms) |
| `GV_MAX_IDENTITY_REQUESTS_PER_WINDOW` | `3` | Max faces to identify per window |
| `GV_GREETING_DELAY_MS` | `300` | Delay between identity requests within a window (ms) |
| `GV_ROI_X` | `0` | Region of Interest left edge (0 = full frame) |
| `GV_ROI_Y` | `0` | Region of Interest top edge |
| `GV_ROI_WIDTH` | `0` | Region of Interest width (0 = disabled) |
| `GV_ROI_HEIGHT` | `0` | Region of Interest height |
| `GV_NET_BACKEND_URL` | `"http://localhost:5000"` | .NET backend base URL |
| `GV_NET_API_KEY` | `""` | API key for `X-API-Key` header |
| `GV_NET_TIMEOUT` | `5` | Backend request timeout (seconds) |
| `GV_NET_CIRCUIT_THRESHOLD` | `5` | Consecutive failures before circuit OPEN |
| `GV_NET_CIRCUIT_RESET_TIMEOUT` | `30.0` | Seconds before HALF_OPEN retry |
| `GV_MIN_FACE_CONFIDENCE` | `0.5` | Minimum detection confidence to process |
| `GV_MIN_FACE_SIZE` | `40` | Minimum face bbox dimension (pixels) |
| `GV_MAX_YAW` | `30` | Maximum head yaw angle (degrees) |
| `GV_LOG_LEVEL` | `"INFO"` | Logging verbosity |

### Shared Config Files
| File | Written by | Purpose |
|------|-----------|---------|
| `config/video_source.json` | .NET `POST /api/config/video-source` + Python `/restart` | Persists camera source + direction across restarts |
| `config/python_settings.json` | Python `POST /config/processing-fps` | Persists processing FPS across restarts |

---

## [QUICK_START]

### Prerequisites
- Python 3.12+
- .NET 9 SDK
- Node.js 20+
- Docker (PostgreSQL + Redis + Qdrant)

### Start Infrastructure
```bash
# One-time: create the shared Docker network
docker network create devnet

docker compose up -d
```

### Setup GateVision AI (two sample edge nodes)
The project includes two sample edge-node configurations. Install dependencies once, then run each gate in its own terminal:

```bash
# One-time install
cd gate_vision_ai
pip install -e .
# GPU not available? Replace onnxruntime-gpu with onnxruntime in pyproject.toml before installing
```

**Terminal 1 — Gate A (webcam index 1, port 8000):**
```bash
./run-gate-a.sh
```

**Terminal 2 — Gate B (sample1.mp4, port 8001):**
```bash
./run-gate-b.sh
```

Each script sets the required `GV_*` environment variables (gate ID, camera source, port, API key) and starts the service. Gate A captures from the first USB camera; Gate B replays the bundled `gate_vision_ai/sample1.mp4` video file. Alternative config files for reference at `gate_vision_ai/env/gate-a.env` and `gate_vision_ai/env/gate-b.env`.

### Setup .NET Backend (port 5000)
```bash
cd GateVision.Api
dotnet restore
dotnet run
# appsettings.Development.json has working defaults for local dev — no secrets needed
# Pre-configured gates: gate-a → http://localhost:8000, gate-b → http://localhost:8001
```

For production:
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=6667;..."
dotnet user-secrets set "Auth:JwtSecret" "your-32-char-min-secret-key!!"
dotnet user-secrets set "Auth:ApiKey" "your-api-key"
```

### Setup Dashboard (port 3000)
```bash
cd dashboard
npm install
npm run dev
# Navigate to http://localhost:3000/login
# Login with: dev-api-key-change-me (from appsettings.Development.json)
# Dashboard auto-discovers gates via GET /api/gates — gate selector in sidebar
```

### Accessing the Gates

| Page | URL | What to see |
|------|-----|-------------|
| Admin dashboard | `http://localhost:3000/dashboard` | Live SSE feed, gate selector in sidebar, face captures |
| Gate status | `http://localhost:3000/gates` | Per-gate status cards with metrics, online/offline indicators |
| Config | `http://localhost:3000/config` | Per-gate video source switcher, direction, training/log-unknown toggles |
| Gate A kiosk | `http://localhost:3000/desk?gateId=gate-a` | Scoped SSE — only Gate A events |
| Gate B kiosk | `http://localhost:3000/desk?gateId=gate-b` | Scoped SSE — only Gate B events |
| All events | `http://localhost:3000/desk` | Aggregate SSE — events from all gates |
