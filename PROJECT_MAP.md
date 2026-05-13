# Identity Verification System - PROJECT_MAP

## [TECH_STACK]

### GateVision AI Microservice (Python)
- FastAPI, port 8000
- InsightFace (SCRFD + ArcFace) with ONNX Runtime (GPU when available, CPU fallback), OpenCV
- httpx for async HTTP to .NET backend (circuit breaker: 5 failures → OPEN, 30s reset)
- pydantic-settings (GV_ prefix)
- Package structure: `pyproject.toml`, relative imports (`from .quality import ...`)

### GateVision .NET Backend
- .NET 9, ASP.NET Core Minimal API, port 5000
- Dapper + pgvector (cosine distance `<=>` operator)
- EF Core for Person + GateEvent entities
- Redis caching (localhost:6379)
- SSE at `/api/events/stream`
- **Authentication:** JWT bearer + X-API-Key middleware
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
                │ SSE:             ?token= query param (API key)                             │
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
GET /api/events/stream?token=xxx
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
| POST /api/identify | JWT/API Key | Identify person by embedding (accepts `direction`). Only persists + SSE-publishes events for known persons (`PersonId` is not null). Unrecognized events are still returned in the response but not stored. |
| POST /api/auth/login | None | Exchange API key for JWT |
| GET /api/health | None | Health check |
| GET /api/persons/count | JWT/API Key | Total enrolled persons count |
| POST /api/persons | JWT/API Key | Create person |
| GET /api/persons | JWT/API Key | List persons |
| GET /api/persons/{id} | JWT/API Key | Get person details |
| GET /api/persons/{id}/faces | JWT/API Key | Get enrolled face images (base64) for person |
| POST /api/persons/{id}/enroll | JWT/API Key | Enroll embedding for person |
| PATCH /api/persons/{id}/status | JWT/API Key | Update person status |
| GET /api/events | JWT/API Key | Event history (name ILIKE + status filter) |
| GET /api/events/stats | JWT/API Key | Today entries, unknowns, pending review |
| GET /api/events/stream | Token (qs) | SSE real-time stream (`?token=`) |

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

### Confidence Thresholds
- `>= 0.85` → Identified (confirmed match)
- `0.65–0.84` → NeedsReview (uncertain)
- `< 0.65` → Unrecognized (unknown, alert)

## [GATEVISION SYSTEM DETAILS]

### GateVision AI Microservice (`gate_vision_ai/`)
- `main.py` — FastAPI lifespan, background capture loop with circuit breaker tracking, state dict for route closures
- `capture.py` — OpenCV video source (reads `GV_CAMERA_SOURCE` — mp4, RTSP, or device index)
- `detector.py` — InsightFace SCRFD detector wrapper with age/gender recognition
- `embedder.py` — ArcFace 512-dim extraction + embedding averaging
- `quality.py` — pose estimation (yaw/pitch), quality checking, face crop, base64 decode
- `routes.py` — all route handlers via `register_routes(app, state: dict)` pattern
- `client.py` — httpx client with circuit breaker (CLOSED/OPEN/HALF_OPEN), failure counting, error differentiation
- `config.py` — pydantic-settings, prefix `GV_` (includes `net_api_key`, `net_circuit_threshold`, `net_circuit_reset_timeout`)
- `processing.py` — shared `process_single_face()` extracted from main.py/routes.py duplicates
- `__main__.py` — `uvicorn.run("gate_vision_ai.main:app")` entry point
- `pyproject.toml` — package config for clean relative imports

### GateVision .NET Backend (`GateVision.Api/`)
- ASP.NET Core 9 Minimal API, port 5000
- Own pgvector DB `gatevision` on port 6667
- FaceEmbedding entity: `Id`, `PersonId`, `Vector` (pgvector 512), `QualityScore`, `CreatedAt`, `FaceImage` (TEXT, base64 JPEG)
- Dapper for vector similarity (parameterized queries)
- EF Core for Person + GateEvent entities
- Redis caching at `localhost:6379` for person name lookups
- `Services/GateEventChannel.cs` — static `Channel<GateEvent>` (bounded 200, DropOldest) for push-based SSE
- JWT bearer authentication + X-API-Key header middleware
- `POST /api/auth/login` returns JWT from shared API key
- Developer exception page gated behind `IsDevelopment()`
- Connection string from config/env/User Secrets (no hardcoded fallback)
- Endpoints: `IdentifyEndpoints.cs`, `PersonEndpoints.cs`, `EventEndpoints.cs`

### GateVision Dashboard (`dashboard/`)
- Next.js 15 App Router, TanStack Query, Tailwind CSS
- Pages: `/login`, `/dashboard`, `/persons`, `/persons/[id]`, `/events`, `/alerts`
- Auth: login page → JWT in localStorage → Bearer token on all API calls
- Auth guard in `AuthContext.tsx` — redirects to `/login` if not authenticated
- API proxy → `localhost:5000` (REST/SSE), `localhost:8000` (MJPEG + `/vision/:path*`)
- Enrollment at `/persons/[id]`: webcam-based guided capture (5 poses) with countdown

### Architecture Rules (enforced)
- Python is the ONLY component touching OpenCV, InsightFace, or any CV/ML library
- Python→.NET data: `{ embedding, frame_quality, captured_at, direction }` only
- Python sends X-API-Key header for auth
- .NET→React data: `{ eventId, personId, personName, confidence, timestamp, direction }` only
- .NET backend never imports any vision library
- Dashboard users authenticate via `/api/auth/login` → JWT → Bearer header

## [FUTURE ENHANCEMENTS]
- Face liveness detection — requires additional sensors
- Mask detection — requires model retraining
- Emotion recognition — requires expression model

## [MILESTONES]

| ID | Goal | Status | Notes |
|----|------|--------|-------|
| G1 | GateVision AI Service | ✅ VERIFIED | FastAPI, background capture, 14/14 smoke tests, circuit breaker |
| G2 | GateVision .NET Backend | ✅ VERIFIED | JWT + API key auth, pgvector, SSE, Redis, no hardcoded creds |
| G3 | GateVision Dashboard | ✅ VERIFIED | Login page, auth guard, 6 pages, TanStack Query, SSE live feed |
| G4 | Docker: Redis + pgvector | ✅ VERIFIED | Added to docker-compose.yml, verified running |
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
| G16 | Filesystem face image storage | 🔄 DEPRECATED v5 | Replaced by DB-only storage — face images are now stored as base64 TEXT in `gate_events.FaceImageBase64` and `face_embeddings.FaceImage` columns. `/api/events/{id}/image` still serves old files if they exist but no new files are written. |
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
| G36 | Face image on face_embeddings | ✅ ADDED v5 | `FaceImage` TEXT (base64) column stores enrolled face crop. New enrollment paths (/enroll/webcam, /enroll/capture) now send face crops to .NET. |
| G37 | Person detail shows enrolled faces | ✅ ADDED v5 | `GET /api/persons/{id}/faces` endpoint returns enrolled face images. Dashboard displays them when enrollment is Active. |
| G38 | Low-confidence UNKNOWN | ✅ ADDED v5 | `IdentificationService.Identify` returns UNKNOWN with null PersonId when confidence < 0.35, eliminating random-person display for noise matches. |
| G39 | Identify stores base64 in DB | ✅ ADDED v5 | `IdentifyEndpoints` no longer writes to `EventImages/` filesystem. FaceCrop is stored directly as `gateEvent.FaceImageBase64`. |
| G40 | Skip persisting Unrecognized events | ✅ ADDED v5 | `IdentifyEndpoints` only persists + SSE-publishes GateEvent when `result.PersonId.HasValue`. UNKNOWN events (no match, low confidence) are still returned in the API response but not written to `gate_events` table or pushed via SSE. |
| G40 | Dashboard: sidebar matched only, strip shows all | ✅ VERIFIED v5 | "Face Captures" strip (center top) shows all detected faces (`liveEvents`). "Target Analysis" sidebar (right) shows only matched events (`matchedEvents`). Employee cache loaded at startup via `fetchPersons` with 5min `staleTime`. `matchedEvents` derived via `useMemo` using a `Set` for O(1) lookup against known employee IDs. |

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

### Python .env (GV_ prefix)
- `GV_CAMERA_SOURCE` - Camera source (default: "0")
- `GV_NET_BACKEND_URL` - .NET backend URL (default: "http://localhost:5000")
- `GV_NET_API_KEY` - API key for X-API-Key header
- `GV_NET_CIRCUIT_THRESHOLD` - Circuit breaker failure threshold (default: 5)
- `GV_NET_CIRCUIT_RESET_TIMEOUT` - Circuit breaker reset timeout in seconds (default: 30.0)

## [QUICK_START]

### Prerequisites
- Python 3.12+
- .NET 9 SDK
- Node.js 20+
- Docker (PostgreSQL pgvector + Redis)

### Start Infrastructure
```bash
docker compose up -d
```

### Setup GateVision AI
```bash
cd gate_vision_ai
pip install -e .
# Set GV_NET_API_KEY in .env or environment
python -m gate_vision_ai
# Port 8000
```

### Setup .NET Backend
```bash
cd GateVision.Api
dotnet restore
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=6667;Database=gatevision;Username=gatevision;Password=localdev"
dotnet user-secrets set "Auth:JwtSecret" "your-32-char-min-secret-key!!"
dotnet user-secrets set "Auth:ApiKey" "dev-api-key-change-me"
dotnet run
# Port 5000
```

### Setup Dashboard
```bash
cd dashboard
npm install
npm run dev
# Port 3000 — navigate to /login to authenticate
```
