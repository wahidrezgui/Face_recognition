# GateVision — Architecture Road Map

---

# Part I — Interaction-Window Architecture

## Architectural Diagnosis

### Current Model (Frame-Driven) — What's Wrong

```
Camera → Frame → detect → identify(immediately) → .NET buffer → SSE → Dashboard
```

- One `/identify` call fires per face per detection cycle — bursts of requests under multi-face scenes
- `EventBufferService` deduplicates by `track_id` after the fact, but requests still hit downstream immediately
- No stable ordering: two simultaneous faces fire two concurrent requests — no deterministic greeting sequence
- Circuit breaker sees micro-bursts → thrashes OPEN → legitimate detections dropped
- "Interaction episode" has no first-class representation — the system thinks in frames, not people

### Target Model (Event-Window-Driven) — What We Build

```
Camera
  ↓
Frame sampler
  ↓
Face detection
  ↓
InteractionWindowManager (250 ms collect + stabilize)
  ↓
IdentityScheduler (rate-limited, max 3 req/window)
  ↓
Stable snapshot (ordering LOCKED at finalization)
  ↓
Greeting queue (250–400 ms inter-greeting delay)
  ↓
UI / audio output
```

### State Machine (Refined)

```
DETECTED → STABILIZING → CONFIRMED → SCHEDULED → GREETED → COOLDOWN
```

| State | Trigger | Duration |
|-------|---------|----------|
| DETECTED | bbox seen for first time | instant |
| STABILIZING | inside 250 ms window | 0–250 ms |
| CONFIRMED | window closed, track survived | instant |
| SCHEDULED | slot reserved in identity queue | awaiting slot |
| GREETED | identity resolved, greeting emitted | instant |
| COOLDOWN | suppress re-greeting same person | configurable |

---

## Files Affected (Impact Analysis)

| File | Change Type | Scope |
|------|-------------|-------|
| `gate_vision_ai/window.py` | **NEW** | `InteractionWindowManager` + `InteractionSnapshot` + `IdentityScheduler` |
| `gate_vision_ai/main.py` | **MODIFY** | Replace immediate per-face `process_single_face()` call with window collection |
| `gate_vision_ai/config.py` | **MODIFY** | Add `window_duration_ms`, `max_identity_requests_per_window`, `greeting_delay_ms` |
| `gate_vision_ai/processing.py` | **UNCHANGED** | `process_single_face()` still used — called by scheduler per confirmed face |
| `GateVision.Api/Services/EventBufferService.cs` | **UNCHANGED** | Still buffers tracks; Python windowing is upstream — .NET logic remains valid |
| `GateVision.Api/Services/IdentificationService.cs` | **UNCHANGED** | API contract unchanged |
| `PROJECT_MAP.md` | **UPDATE** | New components, new metrics, new state machine |

**Files NOT touched:** `.NET` endpoints, dashboard, Redis, Qdrant, Docker.

---

## Step-by-Step Plan

### Step 1 — Add config knobs ✅ confirm before proceeding
**File:** `gate_vision_ai/config.py`

Add three settings with safe defaults:
```python
window_duration_ms: int = 250          # GV_WINDOW_DURATION_MS
max_identity_requests_per_window: int = 3  # GV_MAX_IDENTITY_REQUESTS_PER_WINDOW
greeting_delay_ms: int = 300           # GV_GREETING_DELAY_MS
```
These override-able via env vars (GV_ prefix, existing pattern).

**Verifiable goal:** `settings.window_duration_ms` resolves to 250 by default, overridable by env var.

---

### Step 2 — Create `InteractionWindowManager` ✅ confirm before proceeding
**File:** `gate_vision_ai/window.py` (NEW)

```
InteractionWindowManager
  - window_duration: float (seconds)
  - _faces: dict[track_id → FaceCandidate]  ← highest-conf per track
  - _window_start: float

  collect(track_id, face, confidence, timestamp) → None
    If track already seen: keep highest-confidence entry only.
    Reset window_start on first face in empty window.

  is_window_open() → bool
    Returns True if elapsed < window_duration

  finalize() → InteractionSnapshot
    Sort candidates by confidence DESC.
    Clear internal state.
    Return snapshot.

InteractionSnapshot
  - persons: list[SnapshotPerson]
  - window_start: float
  - window_end: float

SnapshotPerson
  - track_id: int
  - face: dict
  - confidence: float
  - timestamp: str
  - rank: int   ← 1 = highest confidence
```

**Ordering rule:** rank assigned at finalization — immutable after that.

**Verifiable goal:** unit test — feed 5 faces (3 tracks, 2 duplicates), assert snapshot has 3 persons ordered by confidence, duplicates merged.

---

### Step 3 — Create `IdentityScheduler` ✅ confirm before proceeding
**File:** `gate_vision_ai/window.py` (add to same file)

```
IdentityScheduler
  - max_requests: int
  - greeting_delay: float (seconds)

  async schedule(snapshot, backend, direction) → list[IdentityResult]
    Take top min(max_requests, len(snapshot.persons)) candidates.
    For each:
      await process_single_face(...)   ← existing function, unchanged
      await asyncio.sleep(greeting_delay)  ← natural inter-greeting pacing
    Return ordered results.
```

**Key invariant:** once `schedule()` starts, no new face can inject into or reorder the queue for this snapshot. The snapshot is a frozen object.

**Verifiable goal:** with `max_requests=2` and 4 persons in snapshot, only 2 identity calls fire. Confirmed via log count.

---

### Step 4 — Modify `_capture_loop()` in `main.py` ✅ confirm before proceeding
**File:** `gate_vision_ai/main.py`

**Replace with:**
```python
# Feed all detected faces into the window manager
for face in faces:
    tid = _next_track_id(face["bbox"])
    window_manager.collect(tid, face, face["confidence"], now_iso)

# When window expires → finalize and schedule
if not window_manager.is_window_open() and window_manager.has_faces():
    snapshot = window_manager.finalize()
    asyncio.create_task(_process_snapshot(snapshot, backend, direction))
```

New coroutine `_process_snapshot(snapshot, backend, direction)`:
- Calls `scheduler.schedule(snapshot, backend, direction)`
- Logs window metrics: `faces_per_window`, `identities_resolved`, `time_to_first_greeting`
- Appends to `_events_log` (existing pattern)

**Remove from `main.py`:**
- Module-level `_track_best_conf` dict (replaced by `window_manager` dedup)
- Direct `process_single_face()` call in loop body

**Verifiable goal:** with two faces in same frame, only ONE `/identify` window fires after 250 ms, not two immediate calls.

---

### Step 5 — Add interaction metrics to `/stream/status` ✅ confirm before proceeding
**File:** `gate_vision_ai/main.py` (stats dict), `gate_vision_ai/routes.py` (status endpoint)

Extend `_stats` with:
```python
"windows_processed": 0,
"faces_per_window_avg": 0.0,
"identities_resolved_per_window_avg": 0.0,
"time_to_first_greeting_ms_avg": 0.0,
```

The `/stream/status` route already returns `_stats` — no endpoint change needed.

**Verifiable goal:** `/stream/status` JSON includes `windows_processed` key after first window fires.

---

### Step 6 — Update PROJECT_MAP.md ✅ confirm before proceeding

- Add `window.py` to GateVision AI Microservice section
- Add new state machine diagram
- Add interaction metrics to system details
- Add milestones G74–G79 for each step above
- Add ORPHANS entry: old `_track_best_conf` removed

---

## Part I — KPIs

| Metric | Source | Target |
|--------|--------|--------|
| `window_duration_ms` | config | 250 ms |
| `faces_per_window` | window_manager | observed |
| `identities_resolved_per_window` | scheduler | ≤ max_requests |
| `time_to_first_greeting_ms` | scheduler | < 500 ms |
| `time_to_last_greeting_ms` | scheduler | < 1200 ms |

---

## Part I — Execution Order

| # | Step | File(s) | Status |
|---|------|---------|--------|
| 1 | Config knobs | `config.py` | ✅ DONE |
| 2 | `InteractionWindowManager` | `window.py` (new) | ✅ DONE |
| 3 | `IdentityScheduler` | `window.py` | ✅ DONE |
| 4 | Rewire `_capture_loop()` | `main.py` | ✅ DONE |
| 5 | Interaction metrics | `main.py`, `routes.py` | ✅ DONE |
| 6 | Update PROJECT_MAP.md | `PROJECT_MAP.md` | ✅ DONE |

---
---

# Part II — Multi-Gate Architecture

## Architectural Directive

> **Inference stays at the edge. Centralize only: identity resolution, persistence, orchestration, analytics, monitoring.**

Never stream raw video to the central server. Only send embeddings, snapshots, and metadata over the network.

---

## Architectural Diagnosis — Single-Gate Limitations

| Gap | File | Consequence at Scale |
|-----|------|----------------------|
| No `gate_id` in Python config | `config.py` | All edges appear identical to the central server |
| No `gate_id` in API payload | `client.py → NetBackendClient.identify()` | Events cannot be routed to the correct kiosk display |
| No `GateId` on `GateEvent` | `Domain/GateEvent.cs` | Cannot filter events by gate in DB or SSE |
| `EventBufferService` keyed by `TrackId` alone | `Services/EventBufferService.cs` | Two gates sharing `track_id=1` collide and corrupt each other's dedup state |
| `GateEventChannel` is a static singleton | `Services/GateEventChannel.cs` | One SSE stream for all gates — Gate A kiosk sees Gate B's events |
| `/api/events/stream` has no gate parameter | `Endpoints/EventEndpoints.cs` | Cannot scope a kiosk to its own feed |
| Single global API key | `appsettings.json` + `AuthMiddleware.cs` | Cannot authenticate or rate-limit individual gates |
| `/desk` hardcodes global SSE | `app/desk/page.tsx` | Kiosk cannot subscribe to only its own gate |
| No edge resilience when central is down | `client.py` | Events silently lost during central server outages |
| No Prometheus metrics | `routes.py` | Cannot observe per-gate health or detect degradation |
| No nginx, no TLS | `docker-compose.yml` | Not production-deployable across a LAN |

---

## Target Topology

```
                    ┌─────────────────────────────┐
                    │      Central Server         │
                    │─────────────────────────────│
                    │  GateVision.API (.NET)      │
                    │  PostgreSQL                 │
                    │  Qdrant                     │
                    │  Redis                      │
                    │  Dashboard (Next.js)        │
                    │  Prometheus + Grafana       │
                    └──────────────┬──────────────┘
                                   │  LAN (VLAN20)
             ┌─────────────────────┼──────────────────────┐
             │                     │                      │
     ┌───────▼──────┐     ┌───────▼──────┐     ┌────────▼─────┐
     │  Gate A Edge │     │  Gate B Edge │     │  Gate C Edge │
     │  Kiosk PC    │     │  Kiosk PC    │     │  Kiosk PC    │
     │──────────────│     │──────────────│     │──────────────│
     │  Python AI   │     │  Python AI   │     │  Python AI   │
     │  RTSP Capture│     │  RTSP Capture│     │  RTSP Capture│
     │  Face Detect │     │  Face Detect │     │  Face Detect │
     │  ArcFace Emb │     │  ArcFace Emb │     │  ArcFace Emb │
     │  Welcome UI  │     │  Welcome UI  │     │  Welcome UI  │
     └──────────────┘     └──────────────┘     └──────────────┘
```

### Responsibility Split

| Responsibility | Location | Rationale |
|---------------|----------|-----------|
| Video decoding | Edge | RTSP is unreliable over WAN; keep close to camera |
| Face detection | Edge | Bandwidth: raw frames never leave the gate |
| Embedding extraction | Edge | GPU at edge eliminates central GPU dependency |
| Quality filtering | Edge | Reject low-quality frames before any network call |
| Identity matching (Qdrant) | Central | One vector index, always consistent |
| Event persistence (PostgreSQL) | Central | Authoritative audit log |
| Analytics & reporting | Central | Cross-gate aggregation requires shared data |
| Monitoring & alerting | Central | Prometheus scrapes all edge `/metrics` endpoints |
| Welcome screen display | Edge | Push-only; SSE-driven; zero business logic |
| Gate relay control | Edge | Hardware is local; latency-critical |

### Payload: Edge → Central

```json
{
  "gate_id":       "gate-a",
  "embedding":     [ ...512 floats... ],
  "face_crop":     "<base64-jpeg>",
  "track_id":      182,
  "captured_at":   "2026-05-24T07:42:00Z",
  "direction":     "entry",
  "frame_quality": 0.91
}
```

**Never send:** raw frames, RTSP streams, or decoded video.

### SSE Channel Model

```
Gate A kiosk  →  GET /api/events/stream/gate-a   (only Gate A events)
Gate B kiosk  →  GET /api/events/stream/gate-b   (only Gate B events)
Admin dash    →  GET /api/events/stream           (all gates, "_all" aggregate)
```

### Kiosk UI Invariants

- Push-only architecture — kiosk NEVER polls the database
- No business logic, no auth UI, no navigation
- Auto-reconnect SSE on disconnect
- Fullscreen, idle animation when no events

---

## Phase 1 — GateId Domain Foundation *(non-breaking)*

**Goal:** Thread `gate_id` through every layer so multi-gate coexistence works without disrupting any existing single-gate deployment. All changes are additive. Edges without `GV_GATE_ID` fall back to `"default"` gate.

### Files Affected

| File | Change Type | Detail |
|------|-------------|--------|
| `gate_vision_ai/config.py` | MODIFY | Add `gate_id: str = "default"` (env: `GV_GATE_ID`) |
| `gate_vision_ai/client.py` | MODIFY | Add `"gate_id": self.gate_id` to `NetBackendClient.identify()` POST body |
| `GateVision.Api/Domain/GateEvent.cs` | MODIFY | Add `public string GateId { get; set; } = "default"` |
| `GateVision.Api/Domain/TrainingEvent.cs` | MODIFY | Same addition |
| `GateVision.Api/Infrastructure/Db/AppDbContext.cs` | MODIFY | Configure GateId column (max 50, default "default") |
| `GateVision.Api/Db/Scripts/013_AddGateId.sql` | **NEW** | `ALTER TABLE gate_events ADD COLUMN IF NOT EXISTS "GateId" VARCHAR(50) NOT NULL DEFAULT 'default'` + index; same for training_events |
| `GateVision.Api/Endpoints/IdentifyEndpoints.cs` | MODIFY | Add `GateId` to `IdentifyRequestDto`; pass to `BufferOrUpdate` and `Publish` |
| `GateVision.Api/Services/EventBufferService.cs` | MODIFY | Change dedup key from `int TrackId` → `record struct TrackKey(string GateId, int TrackId)` |
| `GateVision.Api/Endpoints/EventEndpoints.cs` | MODIFY | Include `gateId` field in SSE JSON payload and REST response projections |

### Key Design Decisions

- `DEFAULT 'default'` in SQL migration: DbUp runs this idempotently — `IF NOT EXISTS` ensures no-op on re-run; all existing rows backfilled atomically to `"default"`.
- Composite `TrackKey(GateId, TrackId)`: Prevents cross-gate track ID collisions in `EventBufferService`. Gate A and Gate B can both have `track_id=1` — they no longer alias to the same buffer slot.
- Optional field pattern: `.NET` `IdentifyRequestDto.GateId` defaults to `"default"` — existing Python edges that haven't set `GV_GATE_ID` continue working without modification.

### Milestones

| ID | Task | Status |
|----|------|--------|
| G80 | Add `gate_id` to Python config + outbound identify payload | ✅ VERIFIED |
| G81 | Add `GateId` to `IdentifyRequestDto` in .NET | ✅ VERIFIED |
| G82 | DB migration 013 + domain model `GateId` property | ✅ VERIFIED |
| G83 | Refactor `EventBufferService` to composite `TrackKey` | ✅ VERIFIED |

### Verifiable Goal

```sql
-- After setting GV_GATE_ID=gate-a and triggering a detection:
SELECT "GateId" FROM gate_events ORDER BY "CapturedAt" DESC LIMIT 5;
-- Expected: all rows show 'gate-a'
```

Run two Python AI processes with different gate IDs — confirm both `gate-a` and `gate-b` rows coexist without collision.

---

## Phase 2 — Gate-Scoped SSE + Kiosk Display *(internal breaking change)*

**Goal:** Replace the static `GateEventChannel` singleton with a per-gate registry. Add `/api/events/stream/{gateId}`. Update kiosk pages to subscribe to only their gate's stream. Add per-gate API key authentication.

### Files Affected

| File | Change Type | Detail |
|------|-------------|--------|
| `GateVision.Api/Services/GateEventChannel.cs` | **REWRITE** | Replace static singleton with `GateChannelRegistry`: `ConcurrentDictionary<string, Channel<GateEvent>>` + `"_all"` aggregate channel |
| `GateVision.Api/Program.cs` | MODIFY | Register `GateChannelRegistry` as singleton; remove static `GateEventChannel` reference |
| `GateVision.Api/Endpoints/IdentifyEndpoints.cs` | MODIFY | `registry.Publish(dto.GateId, evt)` instead of static call; inject `GateChannelRegistry` |
| `GateVision.Api/Endpoints/EventEndpoints.cs` | MODIFY | Add `GET /api/events/stream/{gateId}` (reads per-gate reader); existing `GET /api/events/stream` reads `"_all"` channel; add `GET /api/gates` returning `registry.ActiveGateIds` |
| `GateVision.Api/appsettings.json` | MODIFY | Add `Auth:GateApiKeys` map: `{ "gate-a": "key-for-gate-a", ... }` |
| `GateVision.Api/Infrastructure/Middleware/AuthMiddleware.cs` | MODIFY | Load per-gate key map; inject `GateId` claim when a gate key authenticates; enforce gate key → gate_id match in identify handler |
| `dashboard/src/hooks/useGateEventStream.ts` | MODIFY | Add optional `gateId?: string`; `buildEventStreamUrl` appends `/{gateId}` when set |
| `dashboard/src/app/desk/page.tsx` | MODIFY | Read `?gateId=` from URL query string; pass to `useGateEventStream` |
| `dashboard/src/app/kiosk/page.tsx` | MODIFY | Same treatment as `/desk` |
| `dashboard/src/app/dashboard/page.tsx` | MODIFY | Replace hardcoded `"Camera 01, Main Entrance"` with dynamic gate selector driven by `GET /api/gates` |

### GateChannelRegistry Design

```csharp
public class GateChannelRegistry
{
    private readonly ConcurrentDictionary<string, Channel<GateEvent>> _channels = new();
    private readonly Channel<GateEvent> _all =
        Channel.CreateBounded<GateEvent>(new BoundedChannelOptions(500)
            { FullMode = BoundedChannelFullMode.DropOldest });

    public void Publish(string gateId, GateEvent evt)
    {
        // Write to gate-specific channel
        GetOrCreate(gateId).Writer.TryWrite(evt);
        // Write to aggregate channel for admin dashboard
        _all.Writer.TryWrite(evt);
    }

    public ChannelReader<GateEvent> GetReader(string gateId) =>
        GetOrCreate(gateId).Reader;

    public ChannelReader<GateEvent> GetAllReader() => _all.Reader;

    public IEnumerable<string> ActiveGateIds => _channels.Keys;

    private Channel<GateEvent> GetOrCreate(string gateId) =>
        _channels.GetOrAdd(gateId, _ => Channel.CreateBounded<GateEvent>(
            new BoundedChannelOptions(200)
                { FullMode = BoundedChannelFullMode.DropOldest }));
}
```

### Kiosk URL Convention

```
/desk?gateId=gate-a    →  subscribes to /api/events/stream/gate-a
/desk                  →  subscribes to /api/events/stream (all gates, fallback)
```

### Per-Gate API Key Enforcement

```csharp
// In IdentifyEndpoints.cs handler:
var authenticatedGateId = ctx.User.FindFirstValue("GateId");
if (authenticatedGateId != null && authenticatedGateId != dto.GateId)
    return Results.Forbid();  // Gate key mismatch — reject
```

### Milestones

| ID | Task | Status |
|----|------|--------|
| G84 | Implement `GateChannelRegistry` + wire into Program.cs | ✅ VERIFIED |
| G85 | Add `GET /api/events/stream/{gateId}` + `GET /api/gates` endpoints | ✅ VERIFIED |
| G86 | Update `/desk` and `/kiosk` pages for gate-scoped SSE | ✅ VERIFIED |
| G87 | Per-gate API keys in `AuthMiddleware` + enforce in identify handler | ✅ VERIFIED |
| G88 | Multi-gate gate selector in admin dashboard | ✅ VERIFIED |

### Verifiable Goal

Run two Python AI processes (`GV_GATE_ID=gate-a`, `GV_GATE_ID=gate-b`).
- `GET /desk?gateId=gate-a` — only gate-a events appear.
- `GET /desk?gateId=gate-b` — only gate-b events appear; gate-a events do not bleed through.
- `GET /api/events/stream` (admin) — events from both gates appear.
- POST to `/api/identify` with a gate-b API key and `gate_id: "gate-a"` → HTTP 403.

### ORPHANS — What Is Removed

| Symbol | File | Reason |
|--------|------|--------|
| `GateEventChannel` (static class) | `Services/GateEventChannel.cs` | Replaced by `GateChannelRegistry` |

---

## Phase 3 — Edge Resilience + Observability *(fully additive)*

**Goal:** Each gate node survives central server outages by buffering events locally and replaying them when connectivity is restored. Per-gate health is visible in Prometheus format.

### The Core Resilience Principle

```
Central server dies
        ↓
Circuit breaker OPENS (after 5 consecutive failures)
        ↓
Edge node buffers events to local SQLite file
        ↓
Central server recovers
        ↓
Circuit breaker transitions to HALF_OPEN → CLOSED
        ↓
Drain loop (every 10s) replays buffered events
        ↓
Events appear in PostgreSQL with original CapturedAt timestamps
        ↓
SSE publish SKIPPED for replayed events (no stale kiosk cards)
```

### Files Affected

| File | Change Type | Detail |
|------|-------------|--------|
| `gate_vision_ai/local_buffer.py` | **NEW** | `LocalEventBuffer`: SQLite-backed queue — `enqueue(gate_id, payload)`, `dequeue_batch(limit)`, `pending_count()` |
| `gate_vision_ai/config.py` | MODIFY | Add `local_buffer_path: str = "gate_events_local.db"` (env: `GV_LOCAL_BUFFER_PATH`) |
| `gate_vision_ai/client.py` | MODIFY | On `circuit_open` or `backend_down` result → call `_local_buffer.enqueue(self.gate_id, body)`. Add `drain_local_buffer()` method: reads batches and replays to `/api/identify?replayed=true` |
| `gate_vision_ai/main.py` | MODIFY | Add `_drain_loop()` background task in lifespan — every 10s when circuit is CLOSED, calls `backend.drain_local_buffer()` |
| `gate_vision_ai/routes.py` | MODIFY | Add `GET /metrics` — Prometheus text format with per-gate counters |
| `GateVision.Api/Endpoints/IdentifyEndpoints.cs` | MODIFY | Add optional `replayed: bool = false` to `IdentifyRequestDto`; when true, skip SSE publish, preserve original `CapturedAt` |

### LocalEventBuffer Design

```python
class LocalEventBuffer:
    """SQLite-backed event queue — activated when central server is unreachable."""

    def __init__(self, db_path: str):
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def enqueue(self, gate_id: str, payload: dict) -> None: ...
    def dequeue_batch(self, limit: int = 20) -> list[dict]: ...
    def pending_count(self) -> int: ...
```

### Prometheus Metrics (`GET /metrics`)

```
# HELP gatevision_frames_captured_total Total frames captured
gatevision_frames_captured_total{gate_id="gate-a"} 18432

# HELP gatevision_faces_detected_total Total faces detected
gatevision_faces_detected_total{gate_id="gate-a"} 412

# HELP gatevision_events_sent_total Identity requests sent to central
gatevision_events_sent_total{gate_id="gate-a"} 398

# HELP gatevision_backend_errors_total Backend errors total
gatevision_backend_errors_total{gate_id="gate-a"} 3

# HELP gatevision_circuit_breaker_state 1=OPEN 0=CLOSED
gatevision_circuit_breaker_state{gate_id="gate-a"} 0

# HELP gatevision_local_buffer_pending Events buffered awaiting replay
gatevision_local_buffer_pending{gate_id="gate-a"} 0
```

### Milestones

| ID | Task | Status |
|----|------|--------|
| G89 | Implement `LocalEventBuffer` (SQLite) + wire into `client.py` | ✅ VERIFIED |
| G90 | Add `_drain_loop()` in `main.py` + `replayed` flag in .NET | ✅ VERIFIED |
| G91 | Add `GET /metrics` Prometheus endpoint to `routes.py` | ✅ VERIFIED |

### Verifiable Goal

1. Stop .NET API → trigger face detection → confirm `gate_events_local.db` has rows.
2. Restart .NET API → within 30s, those rows appear in PostgreSQL with their original `CapturedAt` timestamps.
3. Confirm replayed events do NOT appear on the kiosk live display.
4. `curl http://localhost:8000/metrics` returns valid Prometheus text with `gate_id` labels.

---

## Phase 4 — Infrastructure *(new files only)*

**Goal:** SSL termination, per-gate HTTP routing, edge containerization, and a production-ready Docker Compose layout.

### Files Affected

| File | Change Type | Detail |
|------|-------------|--------|
| `nginx/nginx.conf` | **NEW** | Upstreams for .NET API (5000) and per-gate AI nodes (8000, 8001…); `proxy_buffering off` + `proxy_read_timeout 3600` for SSE; SSL termination |
| `gate_vision_ai/Dockerfile` | **NEW** | Python 3.11-slim base; OpenCV system deps; `GV_GATE_ID` and `GV_NET_BACKEND_URL` as ENV defaults |
| `docker-compose.yml` | MODIFY | Add `nginx` service; add edge node service templates (`gate-a`, `gate-b`); per-gate `GATE_A_API_KEY` env references |
| `GateVision.Api/Program.cs` | MODIFY | CORS reads `Cors:AllowedOrigins` string array from config instead of hardcoded `localhost:3000` |
| `GateVision.Api/appsettings.json` | MODIFY | Add `"Cors": { "AllowedOrigins": ["http://localhost:3000", "https://gatevision.local"] }` |

### nginx SSE Configuration — Critical Details

```nginx
# SSE: disable ALL buffering — nginx buffers break event-stream by default
location /api/events/stream {
    proxy_pass http://dotnet_api;
    proxy_buffering         off;
    proxy_cache             off;
    proxy_set_header        Connection "";
    proxy_http_version      1.1;
    proxy_read_timeout      3600s;   # Must exceed SSE heartbeat interval (default: 30s)
    add_header              X-Accel-Buffering no;
}
```

### Docker Edge Node Template

```yaml
gate-a:
  build:
    context: ./gate_vision_ai
  container_name: gatevision-gate-a
  environment:
    GV_GATE_ID:           gate-a
    GV_NET_BACKEND_URL:   http://dotnet_api:5000
    GV_NET_API_KEY:       "${GATE_A_API_KEY}"
    GV_CAMERA_SOURCE:     "rtsp://192.168.10.11/stream1"
    GV_DIRECTION:         entry
    GV_LOCAL_BUFFER_PATH: /data/gate_events_local.db
  volumes:
    - gate_a_buffer:/data
  restart: unless-stopped
  networks:
    - devnet
```

### Milestones

| ID | Task | Status |
|----|------|--------|
| G92 | Write `nginx/nginx.conf` with SSE-safe config + SSL | ✅ VERIFIED |
| G93 | Write `gate_vision_ai/Dockerfile` + edge service templates in `docker-compose.yml` | ✅ VERIFIED |
| G94 | Update CORS in `Program.cs` + `appsettings.json` for multi-origin | ✅ VERIFIED |

### Verifiable Goal

```bash
docker compose up -d
curl -k https://gatevision.local/api/health
# Expected: {"status":"ok","db":true,"qdrant":true}

# SSE behind nginx — must emit events without stalling:
curl -k -N -H "X-API-Key: ..." https://gatevision.local/api/events/stream/gate-a
# Expected: heartbeat lines + event data within 5 seconds
```

---

## Part II — Migration Risk Matrix

| Change | Risk | Mitigation |
|--------|------|-----------|
| `ALTER TABLE ADD COLUMN IF NOT EXISTS` | Low | Idempotent SQL + `DEFAULT 'default'` backfills existing rows atomically |
| `TrackKey` composite dedup in `EventBufferService` | Low | Internal refactor; external API contract unchanged |
| Removing static `GateEventChannel` | Medium | Two call sites (IdentifyEndpoints + EventEndpoints) must change atomically in Phase 2 |
| nginx SSE buffering | High | `proxy_buffering off` is non-negotiable — test with `curl -N` before production |
| Docker camera passthrough | Medium | Linux `/dev/video0` works natively; Windows requires WSL2 USB passthrough (manual `usbipd` step) |
| Per-gate API key rollout | Low | Global key preserved; per-gate keys are additive — roll out gate-by-gate |

---

## Part II — New KPIs (Per-Gate)

| Metric | Source | Target |
|--------|--------|--------|
| `gatevision_frames_captured_total` | Python `/metrics` | Observed per gate |
| `gatevision_faces_detected_total` | Python `/metrics` | Observed per gate |
| `gatevision_events_sent_total` | Python `/metrics` | Observed per gate |
| `gatevision_circuit_breaker_state` | Python `/metrics` | 0 (CLOSED) under normal operation |
| `gatevision_local_buffer_pending` | Python `/metrics` | 0 under normal operation; spikes during outage |
| `windows_processed` | `.NET /api/events/stream stats` | Increases monotonically |

---

## Part II — Scope Boundaries (What Does NOT Change)

- ArcFace 512-dim embedding format — unchanged
- Qdrant `face_embeddings` collection — no gate-scoping; identity is person-global
- `persons` table — no gate affiliation; one person is recognized at any gate
- Enrollment flow (`/enroll/webcam`, `POST /api/persons/{id}/enroll`) — no changes
- `GET /api/events/stream` global endpoint — preserved for admin dashboard
- `.NET` identity matching business logic — unchanged
- Dashboard JWT auth flow — unchanged
- `.NET` rate limiting (10 req/s on `/api/identify`) — unchanged
- Qdrant vector search threshold (0.35 min, 0.80 identified) — unchanged

---

## Part II — Full Execution Order

| # | Phase | Milestone | Files | Status |
|----|-------|-----------|-------|--------|
| 1 | Phase 1 — GateId Foundation | G80: Python `gate_id` config + payload | `config.py`, `client.py` | ✅ VERIFIED |
| 2 | Phase 1 | G81: .NET `IdentifyRequestDto.GateId` | `IdentifyEndpoints.cs` | ✅ VERIFIED |
| 3 | Phase 1 | G82: DB migration 013 + domain model | `013_AddGateId.sql`, `GateEvent.cs`, `TrainingEvent.cs`, `AppDbContext.cs` | ✅ VERIFIED |
| 4 | Phase 1 | G83: Composite `TrackKey` in `EventBufferService` | `EventBufferService.cs` | ✅ VERIFIED |
| 5 | Phase 2 — SSE + Kiosk | G84: `GateChannelRegistry` + DI wiring | `GateEventChannel.cs`, `Program.cs` | ✅ VERIFIED |
| 6 | Phase 2 | G85: Gate-scoped SSE endpoints + `GET /api/gates` | `EventEndpoints.cs` | ✅ VERIFIED |
| 7 | Phase 2 | G86: Gate-scoped kiosk display | `desk/page.tsx`, `kiosk/page.tsx`, `useGateEventStream.ts` | ✅ VERIFIED |
| 8 | Phase 2 | G87: Per-gate API keys + enforce in identify | `appsettings.json`, `AuthMiddleware.cs`, `IdentifyEndpoints.cs` | ✅ VERIFIED |
| 9 | Phase 2 | G88: Multi-gate gate selector in dashboard | `dashboard/page.tsx` | ✅ VERIFIED |
| 10 | Phase 3 — Resilience | G89: `LocalEventBuffer` + wire into `client.py` | `local_buffer.py`, `client.py`, `config.py` | ✅ VERIFIED |
| 11 | Phase 3 | G90: `_drain_loop()` + `replayed` flag in .NET | `main.py`, `IdentifyEndpoints.cs` | ✅ VERIFIED |
| 12 | Phase 3 | G91: `GET /metrics` Prometheus endpoint | `routes.py` | ✅ VERIFIED |
| 13 | Phase 4 — Infrastructure | G92: `nginx/nginx.conf` with SSE-safe config | `nginx/nginx.conf` | ✅ VERIFIED |
| 14 | Phase 4 | G93: `Dockerfile` + edge compose templates | `gate_vision_ai/Dockerfile`, `docker-compose.yml` | ✅ VERIFIED |
| 15 | Phase 4 | G94: Multi-origin CORS config | `Program.cs`, `appsettings.json` | ✅ VERIFIED |

All four phases (G80–G94) are now **✅ VERIFIED** in the codebase. No pending items remain for Part II.
