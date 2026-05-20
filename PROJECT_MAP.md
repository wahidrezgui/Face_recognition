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
- EF Core for Person + GateEvent entities
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
- Pages: `/login`, `/dashboard`, `/persons`, `/persons/[id]`, `/events`, `/alerts`
- Auth: login page at `/login`, JWT stored in localStorage, sent as Bearer token

## [SYSTEM_FLOW]

```
┌─────────┐    ┌──────────────────┐   X-API-Key   ┌──────────────────┐   Bearer JWT   ┌─────────────┐
│ Camera  │───▶│ GateVision AI    │──────────────▶│ GateVision .NET  │◄──────────────│  Dashboard  │
│ (USB/   │    │ (Python/FastAPI) │  POST /identify│ (Minimal API)    │  /api/auth/    │  (Next.js)  │
│  RTSP)  │    │  port 8000       │  POST /enroll  │  port 5000       │  login→JWT    │  port 3000  │
└─────────┘    └──────────────────┘                └──────────────────┘               └─────────────┘
                     │                                    │                                │
               capture frames                       POST /api/identify              SSE live feed
               detect faces                         cosine sim search               person mgmt
               quality filter                       persist events                  event history
               extract embeddings                   Redis cache                     alerts page
               POST to .NET                         SSE push                        JWT auth
               circuit breaker                      JWT + API key auth              login page

               ┌────────────────────────────────────────────────────────────────────────────┐
                │ Authentication Flow                                                        │
                │                                                                             │
                │ Python → .NET:   X-API-Key header (GV_NET_API_KEY)                         │
                │ Dashboard → .NET: Bearer JWT (from /api/auth/login)                        │
                │ SSE:             ?token= query param (API key or JWT)                      │
                │ Exempt:          /api/health                                                │
               └────────────────────────────────────────────────────────────────────────────┘
```

### Responsibilities
- **GateVision AI**: RTSP/USB capture, SCRFD detection, ArcFace embeddings, quality filtering, HTTP POST to .NET (with circuit breaker)
- **GateVision .NET Backend**: Identify endpoint (cosine similarity), person management, event persistence, Redis cache, SSE real-time push, JWT + API key auth
- **Dashboard**: Login, live SSE feed, person management, event history, alerts, MJPEG camera stream

## [API_CONTRACTS]

### AI → .NET: Identify (requires X-API-Key or Bearer JWT)
```json
POST /api/identify
{
  "embedding": [0.123, -0.442, ...],
  "frameQuality": 0.91,
  "capturedAt": "2026-05-10T10:22:12Z",
  "direction": "entry"
}
→ {
  "eventId": "uuid",
  "personId": "guid",
  "personName": "John Doe",
  "confidence": 0.95,
  "status": "Identified",
  "timestamp": "...",
  "direction": "entry"
}
```

### AI → .NET: Enroll (requires X-API-Key or Bearer JWT)
```json
POST /api/persons/{id}/enroll
{
  "embeddings": [[0.123, ...], ...],
  "qualityScore": 0.8
}
→ 200 OK
```

### Dashboard → .NET: Login (no auth required)
```json
POST /api/auth/login
{
  "apiKey": "dev-api-key-change-me"
}
→ {
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### .NET → Dashboard: SSE Event Stream (JWT or API key via `?token=`)
```
GET /api/events/stream?token=<JWT_or_API_key>
data: { "eventId": "uuid", "personName": "John Doe", "confidence": 0.92, "status": "Identified", "timestamp": "...", "faceImageUrl": "/api/events/{id}/image" }
```

### Live Camera Stream
```
GET /stream → port 8000 (MJPEG from GateVision AI)
Proxied via dashboard/next.config.js
```

### GateVision .NET Endpoints (port 5000)
| Endpoint | Auth | Description |
|----------|------|-------------|
| POST /api/identify | JWT/API Key | Identify person by embedding (accepts `direction`). Buffers all detections in `EventBufferService` keyed by `track_id`. Highest-confidence detection per track is saved to `gate_events` when the track expires (3s of no updates). SSE-publishes every detection immediately for real-time display. Track IDs assigned by Python via bbox IoU tracker. |
| POST /api/config/video-source | JWT/API Key | Set video source (webcam index, file path, or RTSP URL). Atomically writes `config/video_source.json` (temp+rename), POSTs source directly in body to Python `/restart`, then polls `/health` up to 10×300ms to confirm camera is live. |
| POST /api/auth/login | None | Exchange API key for JWT |
| GET /api/health | None | Health check |
| GET /api/persons/count | JWT/API Key | Total enrolled persons count |
| POST /api/persons | JWT/API Key | Create person |
| GET /api/persons | JWT/API Key | List persons |
| GET /api/persons/{id} | JWT/API Key | Get person details |
| GET /api/persons/{id}/faces | JWT/API Key | Get enrolled face image URLs for person |
| GET /api/persons/{id}/face-image/{faceId} | JWT/API Key | Serve enrolled face image file |
| GET /api/persons/{id}/profile-image | JWT/API Key | Serve uploaded profile picture |
| DELETE /api/persons/{id} | JWT/API Key | Delete person, face embeddings, profile images, nullify gate event links |
| POST /api/persons/{id}/enroll | JWT/API Key | Enroll embedding for person (face images saved to `FaceImages/{personId}/` as files, path stored in `FaceImage` column) |
| POST /api/persons/{id}/upload-face | JWT/API Key | Upload a profile picture (multipart form, .jpg/.jpeg/.png) |
| PATCH /api/persons/{id}/status | JWT/API Key | Update person status |
| GET /api/events | JWT/API Key | Event history (name ILIKE + status filter) |
| GET /api/events/stats | JWT/API Key | Today entries, unknowns, pending review |
| DELETE /api/events/{id} | JWT/API Key | Delete a gate event |
| POST /api/events/{id}/review | JWT/API Key | Link event to a person (sets PersonId, updates status to Identified) |
| GET /api/events/stream | Token (qs) | SSE real-time stream (`?token=` accepts API key or JWT) |

### GateVision AI Endpoints (port 8000)
- GET /health - Health check
- POST /identify - Identify face from image
- POST /enroll - Enroll face from image
- POST /enroll/capture - Capture & enroll (system camera)
- POST /enroll/webcam - Enroll from browser webcam (base64 frames)
- GET /stream - MJPEG camera stream
- GET /stream/status - Stream status
- POST /pose - Estimate head pose from base64 frame
- GET /events/recent - Recent events log
- POST /restart - Accept `{ "source": "..." }` in body, open new CameraCapture, warm-up with test frame, swap atomically, persist config (atomic temp+rename), release old capture. Returns 502 if camera opens but delivers no frames.
- GET /cameras - Probe camera indices 0..9, return available with friendly names (Windows: via WMI PowerShell query)

### Confidence Thresholds
- `>= 0.85` → Identified (confirmed match)
- `0.65–0.84` → NeedsReview (uncertain)
- `< 0.65` → Unrecognized (unknown, alert)

## [GATEVISION SYSTEM DETAILS]

### GateVision AI Microservice (`gate_vision_ai/`)
- `main.py` — FastAPI lifespan, background capture loop with circuit breaker tracking, state dict for route closures. On startup reads `config/video_source.json` to override `GV_CAMERA_SOURCE`. Assigns `track_id` per face via bbox-IoU tracker (`_bbox_iou`, `_next_track_id`) — same face keeps same ID across frames, new face gets incremented ID.
- `capture.py` — OpenCV video source (reads `GV_CAMERA_SOURCE` — mp4, RTSP, or device index). Accepts optional `source` param for runtime re-initialization.
- `detector.py` — InsightFace SCRFD detector wrapper with age/gender recognition
- `embedder.py` — ArcFace 512-dim extraction + embedding averaging
- `quality.py` — pose estimation (yaw/pitch), quality checking, face crop, base64 decode
- `routes.py` — all route handlers via `register_routes(app, state: dict)` pattern. `POST /restart` accepts source in body, warm-up test frame before swap, atomic config write via `os.replace()`.
- `client.py` — httpx client with circuit breaker (CLOSED/OPEN/HALF_OPEN), failure counting, error differentiation
- `config.py` — pydantic-settings, prefix `GV_` (includes `net_api_key`, `net_circuit_threshold`, `net_circuit_reset_timeout`)
- `processing.py` — shared `process_single_face()` extracted from main.py/routes.py duplicates
- `__main__.py` — `uvicorn.run("gate_vision_ai.main:app")` entry point
- `pyproject.toml` — package config for clean relative imports

### GateVision .NET Backend (`GateVision.Api/`)
- ASP.NET Core 9 Minimal API, port 5000
- PostgreSQL DB `gatevision` on port 6667 (relational data only)
- Qdrant vector DB on port 6334 (gRPC) for ANN face search via `IVectorStore` → `QdrantVectorStore`
- EF Core for Person + GateEvent entities
- Redis caching at `localhost:6379` for person metadata. Combined key `person:{id}` (Name, Department, WelcomeMessage) — 1 read instead of 3 round-trips.
- `Services/GateEventChannel.cs` — static `Channel<GateEvent>` (bounded 200, DropOldest) for push-based SSE
- `Services/EventBufferService.cs` — `ConcurrentDictionary<int, BufferedTrack>` buffers detections by `track_id`. `BufferOrUpdate()` keeps highest-confidence detection per track. Background `FlushExpiredAsync()` persists tracks idle >3s to `gate_events`. Registered as singleton.
- JWT bearer authentication + X-API-Key header middleware (`Infrastructure/Middleware/AuthMiddleware.cs`)
- `POST /api/auth/login` returns JWT from shared API key
- Developer exception page gated behind `IsDevelopment()`
- Connection string from config/env/User Secrets (no hardcoded fallback)
- Endpoints: `IdentifyEndpoints.cs`, `PersonEndpoints.cs`, `EventEndpoints.cs`

### GateVision Dashboard (`dashboard/`)
- Next.js 15 App Router, TanStack Query, Tailwind CSS
- Pages: `/login`, `/dashboard`, `/persons`, `/persons/[id]`, `/events`, `/alerts`
- Components: `ReviewEventModal` — review/resolve modal for events (link/create/delete + face enrollment) at `events/ReviewEventModal.tsx`
- Auth: login page → JWT in localStorage → Bearer token on all API calls
- Auth guard in `AuthContext.tsx` — redirects to `/login` if not authenticated
- API proxy → `localhost:5000` (REST/SSE), `localhost:8000` (MJPEG + `/vision/:path*`)
- Enrollment at `/persons/[id]`: webcam-based guided capture (5 poses) with countdown

## [ORPHANS & PENDING]

| ID | Gap | Priority | Status |
|----|-----|----------|--------|
| C1 | **Hardcoded credential fallbacks** — `Program.cs:48-49` | 🔴 CRITICAL | ✅ FIXED |
| C2 | **`.env` file with API key** — `gate_vision_ai/.env` | 🔴 CRITICAL | ✅ FIXED |
| C3 | **Test seed in DbUp** — `005_SeedData.sql` runs in production | 🔴 CRITICAL | ✅ FIXED |
| C4 | **Path traversal in image serving** — `EventEndpoints.cs` | 🔴 CRITICAL | ✅ FIXED |
| C5 | **CORS wildcard** — `AllowAnyOrigin` on both backends | 🔴 CRITICAL | ✅ FIXED |
 
| H2 | **CapturedAt uses `DateTime.Parse`** — 500 on bad input | 🟠 HIGH | OPEN |
| H3 | **Base64 face images in SSE payload** | 🟠 HIGH | OPEN |
| H4 | **No rate limiting on enrollment endpoint** | 🟠 HIGH | OPEN |
| H5 | **Redis no auth** in docker-compose | 🟠 HIGH | OPEN |
| M1 | **Stats query full table scan** | 🟡 MEDIUM | OPEN |
| M2 | **Missing DB indexes** on queried columns | 🟡 MEDIUM | OPEN |
| M5 | **Unbounded gate_events growth** — no TTL | 🟡 MEDIUM | OPEN |
| M7 | **stream_status hardcoded** `capture_interval_ms` | 🟡 MEDIUM | ✅ FIXED |
| D1 | **Dead code: smoke_test.py** — 152 lines | 🟡 MEDIUM | OPEN |
| D2 | **Dead code: StatCard.tsx** — unused component | 🟡 MEDIUM | OPEN |

| H6 | **3 Redis round-trips per identify call** — combined into 1 key `person:{id}` | 🟡 MEDIUM | ✅ FIXED |
| H7 | **SSE instant invalidate floods API** — debounced 2s + `setQueryData` direct cache update | 🟡 MEDIUM | ✅ FIXED |
| H8 | **Dashboard re-renders all on every SSE event** — `React.memo` on `EventCard` + `CaptureThumb` | 🟡 MEDIUM | ✅ FIXED |
| M8 | **Unconditional JPEG encode every frame** — now lazy: encodes only when stream connections > 0 | 🟢 LOW | ✅ FIXED |
| H9 | **Event review modal** — Accept button opens `ReviewEventModal` with Link/Create/Delete tabs + enrollment via Python `/enroll/webcam` | 🟠 HIGH | ✅ ADDED v13 |
| H10 | **Person delete endpoint** — `DELETE /api/persons/{id}` removes person, face embeddings, profile images, nullifies gate event links. Dashboard has Delete button with confirmation | 🟠 HIGH | ✅ ADDED v13 |
| M9 | **Config restart file-as-IPC race** — source passed in POST body, atomic write, warm-up frame, health poll | 🟠 HIGH | ✅ FIXED |
| M10 | **Config path resolution fragile** — `request.PathBase` → `IWebHostEnvironment.ContentRootPath` | 🟠 HIGH | ✅ FIXED |

### Architecture Rules (enforced)
- Python is the ONLY component touching OpenCV, InsightFace, or any CV/ML library
- Python→.NET data: `{ embedding, frame_quality, captured_at, direction }` only
- Python sends X-API-Key header for auth
- .NET→React data: `{ eventId, personId, personName, confidence, timestamp, direction }` only
- .NET backend never imports any vision library
- Dashboard users authenticate via `/api/auth/login` → JWT → Bearer header
- SSE `?token=` query param accepts both JWT (validated by JWT Bearer middleware via `OnMessageReceived`) and API key (validated by `AuthMiddleware` as fallback)

## [FUTURE ENHANCEMENTS]
- Face liveness detection — requires additional sensors
- Mask detection — requires model retraining
- Emotion recognition — requires expression model

## [MILESTONES]

| ID | Goal | Status | Notes |
|----|------|--------|-------|
| G1 | GateVision AI Service | ✅ VERIFIED | FastAPI, background capture, 14/14 smoke tests, circuit breaker |
| G2 | GateVision .NET Backend | ✅ VERIFIED | JWT + API key auth, Qdrant, SSE, Redis, no hardcoded creds |
| G3 | GateVision Dashboard | ✅ VERIFIED | Login page, auth guard, 7 pages, TanStack Query, SSE live feed |
| G4 | Docker: Redis + PostgreSQL | ✅ VERIFIED | Added to docker-compose.yml, verified running |
| G5 | Live camera stream on dashboard | ✅ VERIFIED | MJPEG endpoint + Next.js proxy |
| G6 | Webcam enrollment | ✅ VERIFIED | Browser webcam with head-pose guidance |
| G7 | Event filters (name ILIKE + status) | ✅ VERIFIED | Backend + frontend wired |
| G8 | Alerts page real-time SSE | ✅ VERIFIED | Live SSE merge + inline actions |
| G9 | Circuit breaker | ✅ ADDED v3 | Python→.NET HTTP client, 5-failure threshold, 30s reset |
| G10 | JWT + API key auth | ✅ ADDED v3 | All endpoints protected except health + SSE |
| G11 | Credential leak fixed | ✅ ADDED v3 | No hardcoded DB passwords in source |
| G12 | DevExceptionPage guarded | ✅ ADDED v3 | Gated behind IsDevelopment() |
| G13 | Channel-based SSE push | ✅ ADDED v4 | Replaced DB polling with Channel&lt;T&gt; push, zero steady-state queries |
| G14 | Shared processing module | ✅ ADDED v4 | Extracted duplicate `_process_single_face` to `processing.py` |
| G15 | Smoke test removal | ✅ ADDED v4 | Deleted broken `scripts/smoke_test.py` |
| G16 | Filesystem face image storage | 🔄 DEPRECATED v5 | Replaced by base64 TEXT in `gate_events.FaceImageBase64`. `/api/events/{id}/image` still serves old files if they exist but no new files are written. |
| G17 | SSE query string token auth | ✅ ADDED v4 | H12/M8 fixed: `?token=` query param validated against API key |
| G18 | User Secrets + .env.example | ✅ ADDED v4 | H15/M12 fixed: `.env` deleted, `.env.example` templates created |
| G19 | Circuit breaker metrics | ✅ ADDED v4 | Added `open_count` counter + state transition logging |
| G20 | Combined stats query | ✅ ADDED v4 | M16 fixed: three COUNT queries merged into single GroupBy query |
| G21 | DapperQueries removed | ✅ ADDED v4 | H13 fixed: cosine similarity via EF Core `SqlQueryRaw` |
| G22 | CancellationToken on DB calls | ✅ ADDED v4 | M17 fixed: all EF Core async methods pass CancellationToken |
| G23 | 401 handling on dashboard | ✅ ADDED v4 | M18 fixed: `apiFetch` wrapper clears token on 401, redirects to `/login` |
| G24 | Health check pings DB | ✅ ADDED v4 | M5 fixed: `/api/health` now tests DB connectivity |
| G25 | Root page redirects to /dashboard | ✅ ADDED v4 | M6 fixed: unauthenticated users redirected to /login by auth guard |
| G26 | Logout button | ✅ ADDED v4 | M7 fixed: floating logout button on all protected pages |
| G27 | Seed SQL fixed | ✅ ADDED v4 | M4 fixed: replaced broken `string_join`/`array_fill` with working `ARRAY_AGG` |
| G28 | Enroll webcam upper bound | ✅ ADDED v4 | M14 fixed: max 20 frames enforced |
| G29 | quality.py clean import | ✅ ADDED v4 | M10 fixed: removed try/except fallback |
| G30 | Unused dependencies removed | ✅ ADDED v4 | M13 fixed: removed `next-intl` and `lucide-react` |
| G31 | Redis catch logged | ✅ ADDED v4 | M1 fixed: empty catch replaced with error log |
| G32 | FaceImageUrl in API responses | ✅ ADDED v4 | C4: SSE and event list now send `faceImageUrl` instead of base64 blob |
| G33 | WebcamEnrollment extraction | ✅ ADDED v4 | H11 fixed: extracted `CaptureRing.tsx` and `usePoseDetection` hook, 381→135 lines |
| G34 | Rate limiting on /api/identify | ✅ ADDED v4 | H14 fixed: 10 req/s fixed window via built-in rate limiter |
| G35 | .env files deleted | ✅ ADDED v4 | H15 fixed: actual `.env` removed, `.env.example` templates in place |
| G36 | Face image enrollment | ✅ ADDED v5 | Enrollment paths send face crops to .NET, stored as files in `FaceImages/{personId}/`. |
| G37 | Person detail shows enrolled faces | ✅ ADDED v5 | `GET /api/persons/{id}/faces` endpoint returns enrolled face images. Dashboard displays them when enrollment is Active. |
| G38 | Low-confidence UNKNOWN | ✅ ADDED v5 | `IdentificationService.Identify` returns UNKNOWN with null PersonId when confidence < 0.35, eliminating random-person display for noise matches. |
| G39 | Identify stores base64 in DB | ✅ ADDED v5 | `IdentifyEndpoints` no longer writes to `EventImages/` filesystem. FaceCrop is stored directly as `gateEvent.FaceImageBase64`. |
| G40 | Skip persisting Unrecognized events | ✅ ADDED v5 | `IdentifyEndpoints` only persists + SSE-publishes GateEvent when `result.PersonId.HasValue`. UNKNOWN events (no match, low confidence) are still returned in the API response but not written to `gate_events` table or pushed via SSE. |
| G41 | Dashboard: sidebar matched only, strip shows all | ✅ VERIFIED v5 | "Face Captures" strip (center top) shows all detected faces (`liveEvents`). "Target Analysis" sidebar (right) shows only matched events (`matchedEvents`). Employee cache loaded at startup via `fetchPersons` with 5min `staleTime`. `matchedEvents` derived via `useMemo` using a `Set` for O(1) lookup against known employee IDs. |
| G42 | Missing /events page created | ✅ VERIFIED v6 | Created `dashboard/src/app/events/page.tsx` — name ILIKE + status filter, pagination, reuse EventRow component |
| G42 | Triple schema drift fixed | ✅ VERIFIED v6 | Deleted orphaned `db/migrate_add_face_image.sql` and `db/seed.sql`. Created `005_SeedData.sql` as proper DbUp migration. Updated `scripts/seed_db.py` to avoid table creation. |
| G43 | Triple schema drift fixed | ✅ VERIFIED v6 | Deleted orphaned `db/migrate_add_face_image.sql` and `db/seed.sql`. Created `005_SeedData.sql` as proper DbUp migration. Updated `scripts/seed_db.py` to avoid table creation. |
| G44 | Camera source resolution order fixed | ✅ VERIFIED v6 | `capture.py:_resolve_source` now checks file paths before RTSP URLs before `isdigit()` device index |
| G45 | SSE heartbeat with activity backoff | ✅ VERIFIED v6 | `EventEndpoints.cs` starts at 5s, +5s per idle cycle up to 30s, resets to 5s on event activity |
| G46 | SSE error handling on dashboard | ✅ VERIFIED v6 | `createEventStream` passes `onError` callback to set `streamError` state on SSE failure; `onOpen` resets it on reconnect |
| G47 | Dashboard empty state guidance | ✅ VERIFIED v6 | Face Captures strip and Target Analysis sidebar show contextual help: link to Persons page when no persons enrolled, descriptive messages when awaiting detections |
| G48 | Debug console.log removed | ✅ VERIFIED v6 | Removed `[liveEvents]` debug logging from dashboard |
| G49 | Full code audit report v6 | ✅ VERIFIED v6 | Generated non-interactive audit: 43 source files, 5 CRITICAL, 5 HIGH, 7 MEDIUM findings identified |
| G50 | Orphan inventory documented | ✅ VERIFIED v6 | [ORPHANS & PENDING] updated with 16 open items across CRITICAL/HIGH/MEDIUM priorities |
| G51 | C1: Remove credential fallback defaults | ✅ FIXED v6 | `Program.cs` throws `InvalidOperationException` if `Auth:JwtSecret` or `Auth:ApiKey` not configured |
| G52 | C2: Delete .env with hardcoded API key | ✅ FIXED v6 | Deleted `gate_vision_ai/.env`; created `.env.example` with placeholder values |
| G53 | C3: Exclude seed data from DbUp auto-migration | ✅ FIXED v6 | Added `s => !s.Contains("Seed")` filter to `WithScriptsEmbeddedInAssembly` |
| G54 | C4: Fix path traversal in image serving | ✅ FIXED v6 | `Path.GetFullPath` + `StartsWith(ImageDir)` bounds check added |
| G55 | C5: Lock CORS to explicit origins | ✅ FIXED v6 | Both backends: `WithOrigins("http://localhost:3000")` instead of `AllowAnyOrigin` |
| G56 | ROI frame overlay + cropped detection | ✅ ADDED v6 | Configurable ROI via `GV_ROI_X/Y/WIDTH/HEIGHT` env vars or `POST /roi` API. Detection limited to ROI region; green rectangle drawn on MJPEG stream |
| G57 | SSE publishes all detections | ✅ FIXED v6 | Unknown faces now published via SSE (not persisted), so Face Captures strip shows all detected faces |
| G58 | M7: stream_status hardcoded value fixed | ✅ FIXED v6 | `capture_interval_ms` now reads from `settings.capture_interval_ms` instead of hardcoded 500 |
| G59 | Interactive ROI editor on dashboard | ✅ ADDED v6 | `RoiEditor` component: drag to move, corner/edge handles to resize. ROI saved to localStorage + sent to Python `/roi`. Survives service restart via localStorage replay on page load. |
| G60 | Face images saved as files instead of base64 in DB | ✅ ADDED v7 | `EnrollmentService.Enroll()` decodes base64 face crop, saves to `FaceImages/{personId}/{embeddingId}.jpg`. `FaceImage` column now stores relative file path. `GET /api/persons/{id}/faces` returns `imageUrl` instead of inline base64. New `GET /api/persons/{id}/face-image/{faceId}` endpoint serves files with path traversal protection. |
| G61 | Profile picture upload | ✅ ADDED v7 | `POST /api/persons/{id}/upload-face` accepts multipart file upload (.jpg/.jpeg/.png). Saves as `FaceImages/{personId}/profile.ext`. Served via `GET /api/persons/{id}/profile-image`. Frontend person detail page shows circular avatar with upload button. |
| G62 | Sidebar dedup: same person within 5s | ✅ ADDED v8 | `page.tsx` SSE handler deduplicates matched events by `personId` within a 5-second window (using event timestamps). When a new SSE event arrives for a known personId and a prior event exists within 5s, the old entry is **replaced** in-place instead of appended. Unknown persons (`personId === null`) are never deduped, preserving the "Face Captures" strip showing all detections. |
| G63 | Proper auth middleware extracted | ✅ ADDED v9 | Inline auth middleware in `Program.cs` extracted to `Infrastructure/Middleware/AuthMiddleware.cs`. `?token=` query param now validates BOTH API key (plaintext) and JWT (HMAC-SHA256). `OnMessageReceived` event on JWT Bearer handler forwards `?token=` from SSE requests into the Bearer pipeline. Frontend `createEventStream` prefers JWT token over API key for SSE connections. |
| G64 | Video source config on the fly | ✅ ADDED v10 → REFACTORED v12 | Dashboard Config page allows switching between webcam (`0`), sample video (`sample.mp4`), or RTSP URL. v12: Source passed directly in POST body (no file-as-IPC race). Atomic config write (temp+rename). Warm-up test frame before swap. Health poll after restart. Broken `request.PathBase` path resolution replaced with `IWebHostEnvironment.ContentRootPath`. |
| G65 | Persist only Identified events | 🔄 REPLACED v11 | Superseded by G66 — buffered approach now saves all detections once per crossing. |
| G66 | Buffered track-based event persistence | ✅ ADDED v11 | `EventBufferService` buffers detections by `track_id`, keeps highest confidence per track. Background flush at 1s interval persists expired tracks (3s idle) to `gate_events`. Python assigns `track_id` via bbox IoU overlap (>0.3 = same track). SSE still publishes every detection in real-time. |
| G70 | Redis: 3 keys → 1 combined key | ✅ ADDED v12 | `PersonCacheData` record. `CacheService.GetPersonAsync/SetPersonAsync/RemovePersonAsync`. All 13 cache references across 3 files migrated. |
| G71 | SSE: debounced invalidate + direct cache | ✅ ADDED v12 | `setQueryData` prepends events directly into cache. Background refresh debounced to 2s window. `refetchInterval: 30s` for consistency. `useRef` cleanup on unmount. |
| G72 | React.memo on dashboard cards | ✅ ADDED v12 | `EventCard` + `CaptureThumb` wrapped with `React.memo`. Custom comparator checks `eventId` + `confidence` to skip unnecessary re-renders. |
| G73 | Lazy JPEG encoding | ✅ ADDED v12 | MJPEG stream only encodes JPEG when `stream_connections > 0`. Counter tracks active viewers via `finally` block. Saves ~2-5ms CPU per frame when dashboard is closed. |
| P3 | **Phase 3: Remove pgvector** — fully migrated to Qdrant | ✅ COMPLETED | Deleted `face_embeddings` table (migration 009), dropped pgvector extension (migration 010), switched docker image to `postgres:16-alpine`, removed dead `FaceEmbedding.cs`, cleaned up legacy scripts, updated all documentation. Qdrant is the sole vector store. |

## [CONFIGURATION]

### .NET appsettings.Development.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=6667;Database=gatevision;Username=gatevision;Password=localdev",
    "Redis": "localhost:6379"
  },
  "Auth": {
    "JwtSecret": "dev-secret-key-32-chars-min!!",
    "ApiKey": "dev-api-key-change-me"
  }
}
```
(Production: set via `appsettings.json` with empty strings + User Secrets/env vars)

### Environment Variables (override appsettings)
- `ConnectionStrings__DefaultConnection` - DB connection string
- `Auth__JwtSecret` - JWT signing key
- `Auth__ApiKey` - Shared API key

### Shared Config File (`config/video_source.json`)
- Written atomically by .NET `POST /api/config/video-source` (temp+rename, no partial read risk). Written again by Python `/restart` for persistence.
- Format: `{ "camera_source": "0" | "sample.mp4" | "rtsp://..." }`
- Persists across service restarts; Python startup reads it to override `GV_CAMERA_SOURCE`
- **`/restart`** does NOT re-read this file — source is passed directly in POST body from .NET

### Python .env (GV_ prefix)
- `GV_CAMERA_SOURCE` - Camera source (default: "0", overridden by `config/video_source.json` if present)
- `GV_NET_BACKEND_URL` - .NET backend URL (default: "http://localhost:5000")
- `GV_NET_API_KEY` - API key for X-API-Key header
- `GV_NET_CIRCUIT_THRESHOLD` - Circuit breaker failure threshold (default: 5)
- `GV_NET_CIRCUIT_RESET_TIMEOUT` - Circuit breaker reset timeout in seconds (default: 30.0)

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

### Setup GateVision AI (port 8000)
```bash
cd gate_vision_ai
pip install -e .
# GPU not available? Replace onnxruntime-gpu with onnxruntime in pyproject.toml before installing

# Copy env template and set the API key (must match Auth:ApiKey in .NET config)
cp .env.example .env
# Edit .env → set GV_NET_API_KEY=dev-api-key-change-me (or your custom key)

python -m gate_vision_ai
```

### Setup .NET Backend (port 5000)
`appsettings.Development.json` already has working defaults for local dev — no secrets needed:
```bash
cd GateVision.Api
dotnet restore
dotnet run
```

For production or non-dev environments, override via User Secrets or environment variables:
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=6667;Database=gatevision;Username=gatevision;Password=..."
dotnet user-secrets set "Auth:JwtSecret" "your-32-char-min-secret-key!!"
dotnet user-secrets set "Auth:ApiKey" "your-api-key"
```

### Setup Dashboard (port 3000)
```bash
cd dashboard
npm install
npm run dev
# Navigate to http://localhost:3000/login
# Login with API key: dev-api-key-change-me (default from appsettings.Development.json)
```
