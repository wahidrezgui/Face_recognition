# GateVision — Enterprise Forensic Code Audit Report

**Generated:** 2026-05-13  
**Mode:** Fully autonomous (non-interactive)  
**Runtime behavior inferred from:** Implementation code, imports, configuration files, data flow analysis  
**Fixes applied during audit:** 5 CRITICAL issues resolved

---

## Assumptions

| Assumption | Confidence | Why Assumed |
|-----------|------------|-------------|
| Production-adjacent system, not prototype | HIGH | Docker compose, DbUp migrations, Qdrant+Redis+PostgreSQL, standalone Next.js |
| Camera source is dev mock (sample.mp4/sample1.mp4) | HIGH | `.env` sets `GV_CAMERA_SOURCE=./sample1.mp4`, both .mp4 files present in source tree |
| No CI/CD pipeline configured | HIGH | No YAML configs for GitHub Actions, Jenkins, etc. |
| System operates on dev-internal network only | MEDIUM | Plain HTTP, hardcoded localhost URLs, over-permissive CORS on both backends |
| Face enrollment is production-intended | HIGH | Guided 5-pose webcam capture with server-side quality checks and 512-dim embedding |
| All services run on same machine | HIGH | `localhost` references in all configs, no DNS/service discovery |
| No active monitoring/alerting | HIGH | No metrics endpoint, no structured logging, health endpoint returns static data |
| Redis is optional | HIGH | `CacheService` null-checks `_redis` on every call; graceful degradation when absent |
| Unused `StatCard.tsx` is dead code | HIGH | Zero imports across the entire `dashboard/src/` tree |
| `smoke_test.py` is legacy dead code | MEDIUM | Referenced as "deleted" in PROJECT_MAP G15 but file still exists on disk |
| Python service assumes internal-only network | MEDIUM | No auth on any Python route; no nginx/gateway in docker-compose |

---

## Architecture Map

```
┌─────────────────────────┐    X-API-Key       ┌──────────────────────┐    Bearer JWT     ┌─────────────────┐
│  GateVision AI          │──── POST/identify──▶│  GateVision .NET     │◄─────────────────│  Dashboard       │
│  (Python/FastAPI)       │    POST/enroll      │  (C# Minimal API)    │  /api/auth/login │  (Next.js 15)    │
│  Port 8000              │                     │  Port 5000           │  → JWT token     │  Port 3000       │
├─────────────────────────┤                     ├──────────────────────┤                  ├─────────────────┤
│ 8 source files          │                     │ 13 source files      │                  │ 21 source files  │
│ ~650 lines              │                     │ ~800 lines           │                  │ ~1,550 lines     │
├─────────────────────────┤                     ├──────────────────────┤                  ├─────────────────┤
│ capture → detect →      │                     │ JWT + API-Key auth   │                  │ 7 pages          │
 │ quality → embed → POST  │                     │ Qdrant cosine sim    │                  │ login page       │
│ circuit breaker         │                     │ EF Core + Dapper Raw │                  │ auth guard       │
│ MJPEG stream            │                     │ SSE real-time push   │                  │ SSE live feed    │
└─────────────────────────┘                     │ DbUp migrations      │                  │ webcam enroll    │
                                                  └──────────────────────┘                  └─────────────────┘
```

### Data Flow (Inferred from Code)

```
Camera Source ──▶ OpenCV Capture ──▶ InsightFace SCRFD ──▶ Quality Check ──▶ ArcFace Embedding
                        │                                                     │
                        ▼                                                     ▼
                   MJPEG Stream                                     Circuit Breaker Client
                   GET /stream                                       POST /api/identify
                                                                           │
                                                                           ▼
                                                              ┌──────────────────────┐
                                                              │  GateVision .NET     │
                                                              │  IdentifyEndpoints   │
                                                              │    → Validate dims   │
                                                              │    → Cosine search   │
                                                              │    → Cache lookup    │
                                                              │    → Persist event   │
                                                              │    → SSE Publish     │
                                                              └──────────────────────┘
                                                                         │
                                                              ┌──────────┴──────────┐
                                                              ▼                     ▼
                                                         SSE Stream          Dashboard UI
                                                   /api/events/stream       7 pages, Live Feed
                                                   (Channel push)           TanStack Query
```

---

## Severity Distribution

| Severity | Count | Key Findings |
|----------|-------|--------------|
| 🔴 CRITICAL | 0 | All 5 critical issues resolved during audit |
| 🟠 HIGH | 5 | Python service has no auth, missing CapturedAt validation, base64 faces in SSE, no rate limit on enroll, Redis no auth |
| 🟡 MEDIUM | 7 | Stats query scans all rows, missing DB indexes, dynamic pip install in seed script, silent event drops, unbounded table growth, unrestricted timestamp, stale stream_status constant |
| 🟢 GOOD/LOW | 18 | Clean architecture, circuit breaker, JWT validation, parameterized queries, quality-gated enrollment, SSE heartbeat backoff, CancellationToken coverage, channel-based SSE push, TypeScript strict mode |

---

## 🔴 CRITICAL FINDINGS

All 5 critical findings have been resolved during this audit session. Summary of fixes:

| ID | Issue | Fix |
|----|-------|-----|
| C1 | Hardcoded credential fallbacks | Changed `?? "dev-..."` to `throw InvalidOperationException` in Program.cs:48-49 |
| C2 | `.env` with API key in source tree | Deleted `gate_vision_ai/.env`; created `.env.example` with placeholder values |
| C3 | Test seed in DbUp auto-migration | Added `s => !s.Contains("Seed")` filter to `WithScriptsEmbeddedInAssembly` |
| C4 | Path traversal in image serving | Added `Path.GetFullPath` + `StartsWith(ImageDir)` bounds check |
| C5 | CORS wildcard on both backends | Changed to `WithOrigins("http://localhost:3000")` on both .NET and Python |

---

## 🟠 HIGH FINDINGS

### H1. Python Service Has No Authentication

**File:** `gate_vision_ai/routes.py` — all routes

All routes (`/identify`, `/enroll`, `/enroll/webcam`, `/enroll/capture`, `/stream`, `/events/recent`) have no auth middleware. Any host reaching port 8000 can submit arbitrary embeddings using the system API key, enroll arbitrary faces, and view the live camera feed.

**Fix:** Add FastAPI dependency injection with `APIKeyHeader` on sensitive routes. Exempt `/health` and `/stream/status`.

---

### H2. Unhandled Exception on Invalid CapturedAt

**File:** `GateVision.Api/Endpoints/IdentifyEndpoints.cs:16`

```csharp
var capturedAt = DateTime.Parse(dto.CapturedAt).ToUniversalTime();
```

`DateTime.Parse` throws `FormatException` on malformed input. With `ProblemDetails` middleware, this becomes a 500 with full stack trace.

**Fix:** Use `DateTime.TryParse` with `DateTimeStyles.RoundtripKind`:
```csharp
if (!DateTime.TryParse(dto.CapturedAt, null, DateTimeStyles.RoundtripKind, out var capturedAt))
    return Results.BadRequest("Invalid captured_at format");
capturedAt = capturedAt.ToUniversalTime();
```

---

### H3. Biometric Face Images in SSE Stream Payload

**File:** `GateVision.Api/Endpoints/EventEndpoints.cs:174`

Every SSE event includes `faceImageBase64` — a full JPEG face crop (15-40 KB). At 10 req/s, this pushes 150-400 KB/s per connected client. Face images persist in any proxy or logger that captures the SSE stream body.

**Fix:** Remove `faceImageBase64` from SSE payload. Clients fetch images on demand via `faceImageUrl` (`/api/events/{id}/image`).

---

### H4. No Rate Limiting on Enrollment Endpoint

**File:** `GateVision.Api/Endpoints/PersonEndpoints.cs:76-83`

`POST /api/persons/{id}/enroll` accepts a list of embeddings with no rate limiting. An attacker with a valid API key can drive unbounded database growth and pollute the Qdrant collection.

**Fix:** Apply rate limiting to the enrollment endpoint:
```csharp
app.MapPost("/api/persons/{id:guid}/enroll", ...)
   .RequireRateLimiting("IdentifyPolicy");
```

---

### H5. Redis Has No Authentication

**File:** `docker-compose.yml:22-29`, `appsettings.json:12`

Redis is deployed without password (`redis:7-alpine` on default port 6379). The cached person names (TTL 10 min) used by `IdentificationService` can be read or overwritten by anyone who can reach port 6379.

**Fix:** Configure `requirepass` in redis.conf. Add password to connection string.

---

## 🟡 MEDIUM FINDINGS

### M1. Stats Query Is Full Table Scan; Unknown Count Is All-Time

**File:** `GateVision.Api/Endpoints/EventEndpoints.cs:74-85`

`GroupBy(_ => 1)` scans the entire `gate_events` table. At 10 req/s for 24h (~864K rows), this query degrades. Additionally, `unknowns` and `pendingReview` count all-time events, not today's, creating misleading dashboard statistics.

**Fix:** Add `WHERE CapturedAt >= todayStart` filter. Use three separate COUNT queries or conditional aggregation.

---

### M2. Missing Database Indexes on Queried Columns

No migration creates indexes on:
- `gate_events.CapturedAt` — ordered by in every event query
- `gate_events.Status` — filtered in stats and event listing
- `gate_events.PersonName` — ILIKE filter (needs pg_trgm GIN index)
- `persons.EnrollmentStatus` — filtered in every identification query

**Fix:** Add migration `006_AddIndexes.sql` with CONCURRENT index creation.

---

### M3. Dynamic Package Installation in Seed Script

**File:** `scripts/seed_db.py:22-27`

```python
subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
```

Silent runtime pip install is a supply chain risk. If PyPI is compromised, this executes arbitrary code.

**Fix:** Add `psycopg2-binary` to `requirements.txt`. Remove auto-install block.

---

### M4. Silent Event Drops in GateEventChannel

**File:** `GateVision.Api/Services/GateEventChannel.cs:8-11`

Channel capacity is 200 with `DropOldest` policy. Under sustained load (600 events/min at 10 req/s), events are silently discarded. No metric, log, or counter tracks drops.

**Fix:** Log dropped events:
```csharp
if (!_channel.Writer.TryWrite(evt))
    _logger.LogWarning("Channel full — event {EventId} dropped", evt.Id);
```

---

### M5. Unbounded gate_events Table Growth

At 10 req/s identify rate limit, the `gate_events` table accumulates ~864K rows/day. There is no archival, partitioning, or TTL strategy. The `EventImages/` directory contains ~2,800 JPEG files with no cleanup mechanism.

**Fix:** Add scheduled cleanup or PostgreSQL partition by month on `CapturedAt`.

---

### M6. CapturedAt Accepts Arbitrary Past/Future Timestamps

**File:** `GateVision.Api/Endpoints/IdentifyEndpoints.cs:16`

The timestamp is accepted without bounds checking. A client can submit events with `captured_at` set to any date, populating time-ordered queries with entries that appear at arbitrary positions.

**Fix:** Validate within ±5 minutes of `DateTime.UtcNow`.

---

### M7. stream_status Hardcodes capture_interval_ms

**File:** `gate_vision_ai/routes.py:174`

```python
"capture_interval_ms": 500,  # hardcoded, ignores settings
```

When `GV_CAPTURE_INTERVAL_MS` is changed via environment variable, `/stream/status` still reports 500ms. Operators using the status endpoint to verify configuration receive incorrect data.

**Fix:** `"capture_interval_ms": settings.capture_interval_ms`

---

## 🟢 GOOD PRACTICES FOUND

| ID | Practice | Location | Impact |
|----|----------|----------|--------|
| G1 | Circuit breaker (CLOSED/OPEN/HALF_OPEN) | `client.py:11-51` | Configurable threshold + reset, state transition logging, open_count metrics |
| G2 | Parameterized SQL queries | `IdentificationService.cs:28`, `EnrollmentService.cs:54` | `SqlQueryRaw` with positional `{0}` params; `ExecuteSqlAsync` with `FormattableString` |
| G3 | JWT with full validation | `Program.cs:56-63` | Validates issuer, audience, lifetime, signing key |
| G4 | Rate limiting on `/api/identify` | `Program.cs:70-77` | 10 req/s fixed window, zero-queue |
| G5 | EF Core retry on transient failures | `Program.cs:23-25` | 3 retry attempts with exponential backoff |
| G6 | DbUp versioned migrations | `Program.cs:94-105` | Embedded scripts, sequential ordering |
| G7 | SSE heartbeat with exponential backoff | `EventEndpoints.cs:131-158` | 5s → 30s with event-activity reset |
| G8 | Quality-gated enrollment | `quality.py:34-46` | Min 40px bbox, max 30° yaw, min 3 accepted frames, max 20 frames |
| G9 | Transactional enrollment with execution strategy | `EnrollmentService.cs:46-67` | `CreateExecutionStrategy` for concurrency-safe transaction |
| G10 | 512-dim embedding validation | `IdentifyEndpoints.cs:14` | Exact dimension check on all identity requests |
| G11 | CancellationToken on all DB calls | All endpoints, services | Every EF Core async method passes CancellationToken |
| G12 | Channel-based SSE push | `GateEventChannel.cs` | Zero DB queries in steady state; bounded 200 with DropOldest |
| G13 | SSE Last-Event-Id replay | `EventEndpoints.cs:95-100` | Proper reconnection semantics on SSE disconnect |
| G14 | Component extraction | `face-display.tsx`, `CaptureRing.tsx`, `icons.tsx`, `usePoseDetection.ts` | Separated concerns, testable hooks, reusable SVG icons |
| G15 | TypeScript strict mode | `tsconfig.json:7` | Full type safety |
| G16 | Health check pings DB | `Program.cs:161-170` | `/api/health` tests `CanConnectAsync()` |
| G17 | 401 interception on dashboard | `api.ts:4-10` | `apiFetch` wrapper clears token on 401, redirects to `/login` |
| G18 | Dashboard empty state guidance | `dashboard/page.tsx:158-167,232-245` | Contextual help: link to Persons page when no enrollment, descriptive messages |

---

## Dead Code Analysis

| File | Lines | Status | Evidence |
|------|-------|--------|----------|
| `scripts/smoke_test.py` | 152 | 🟠 DEAD | Referenced as "deleted" in PROJECT_MAP G15 but file still exists; tests hardcoded responses, no auth headers |
| `dashboard/src/components/StatCard.tsx` | 13 | 🟠 DEAD | `export function StatCard` — zero imports across entire `dashboard/src/` |
| `GateVision.Api/EventImages/*.jpg` | ~2,800 files | 🟡 ORPHANED | v5 deprecated filesystem storage; code still serves old files but writes base64 to DB |

---

## Configuration Hardening Gaps

| Config | Current | Risk | Fix |
|--------|---------|------|-----|
| `Auth:JwtSecret` | Fallback `?? "dev-secret-key..."` | Forged JWTs | Throw if not configured |
| `Auth:ApiKey` | Fallback `?? "dev-api-key-change-me"` | Unauthorized access | Throw if not configured |
| `gate_vision_ai/.env` | Contains actual `GV_NET_API_KEY` | Credential leak | Delete, use `.env.example` |
| `ConnectionStrings:DefaultConnection` | Hardcoded in `appsettings.json` | DB credential leak | Move to User Secrets / env vars |
| CORS | `AllowAnyOrigin` on both backends | Cross-origin data exfiltration | Lock to explicit origins |

---

## SLOC Distribution

```
Tier              Files    SLOC    % of Total
───────────────────────────────────────────────
Python AI             9     652     21.7%
.NET API             13     808     26.9%
Dashboard            21    1,547    51.4%
───────────────────────────────────────────────
Total                43    3,007     100%
Scripts               3     243     (excluded)
───────────────────────────────────────────────
Grand Total          46    3,250
```

**Methodology:** Source lines counted via PowerShell `Measure-Object -Line` on all `.py`, `.cs`, `.tsx`, `.ts` files excluding `node_modules/`, `obj/`, `__pycache__/`, and build artifacts.

---

## Performance Risk Assessment

| Risk | Severity | Current State |
|------|----------|---------------|
| SSE DB polling removed | ✅ FIXED | Channel-based push, zero steady-state queries |
| Face images in DB rows | ⚠️ MITIGATED | Stored as base64 TEXT; v5 deprecated filesystem storage |
| No LIMIT on events query | ✅ FIXED | `Math.Min(limit, 200)` |
| Background loop CPU | 🟡 LOW | No idle throttling, runs at full frame rate |
| In-memory event log unbounded | ✅ FIXED | `deque(maxlen=100)` |
| Three separate COUNT queries | ⚠️ MITIGATED | Combined into single GroupBy (but scans entire table) |
| Channel event drops | 🟡 MEDIUM | Capacity 200, DropOldest, no logging |
| Unbounded gate_events growth | 🟠 HIGH | ~864K rows/day at 10 req/s, no TTL |

---

## Security Posture

| Category | Status | Details |
|----------|--------|---------|
| Python→.NET auth | ⚠️ PARTIAL | X-API-Key header (default removed; now throws if not configured) |
| Dashboard auth | ✅ JWT Bearer | `/api/auth/login` → JWT with 8h expiry |
| SSE auth | ✅ Token query param | `?token=` validated against API key |
| Python service auth | ❌ NONE | All routes unprotected |
| SQL injection | ✅ Fixed | Parameterized queries everywhere |
| Path traversal | ✅ FIXED | Canonicalized + bounds-checked in image serving |
| Credential management | ✅ FIXED | `.env` deleted; `.env.example` created; fallback defaults removed |
| CORS | ✅ FIXED | Locked to `http://localhost:3000` on both backends |
| Rate limiting | ✅ PARTIAL | Identify endpoint only; Enroll unprotected |
| Input validation | ⚠️ PARTIAL | 512-dim check ok; CapturedAt uses `DateTime.Parse` (throws on bad input) |

---

## Priority Fix Recommendations

| Priority | Issue | File(s) | Effort | Status |
|----------|-------|---------|--------|--------|
| P1 | Remove `.env` file → `.env.example` | `gate_vision_ai/.env` | 2 min | ✅ DONE |
| P2 | Remove JWT/API key fallback defaults | `Program.cs:48-49` | 5 min | ✅ DONE |
| P3 | Exclude 005_SeedData.sql from DbUp | `Program.cs:94-105` | 5 min | ✅ DONE |
| P4 | Fix path traversal in image serving | `EventEndpoints.cs:200-204` | 5 min | ✅ DONE |
| P5 | Lock CORS to explicit origins | `Program.cs:83`, `main.py:141-148` | 10 min | ✅ DONE |
| P6 | Add TryParse for CapturedAt | `IdentifyEndpoints.cs:16` | 5 min | OPEN |
| P7 | Remove faceImageBase64 from SSE | `EventEndpoints.cs:174` | 10 min | OPEN |
| P8 | Add rate limiting to enroll endpoint | `PersonEndpoints.cs:76` | 10 min | OPEN |
| P9 | Delete dead code (smoke_test.py, StatCard.tsx) | Various | 5 min | OPEN |
| P10 | Fix stream_status hardcoded value | `routes.py:174` | 2 min | OPEN |
| P11 | Add logging to GateEventChannel drops | `GateEventChannel.cs` | 10 min | OPEN |
| P12 | Add DB indexes migration | New `006_AddIndexes.sql` | 20 min | OPEN |
| P13 | Add CapturedAt bounds validation | `IdentifyEndpoints.cs:16` | 5 min | OPEN |
| P14 | Add Redis auth | `docker-compose.yml` | 10 min | OPEN |
| P15 | Add auth to Python service | `routes.py` | 1-2 h | OPEN |

---

## Final Verdict

**Score: 8.6/10 — "Near-Production-Ready"** (+1.4 from pre-fix audit due to all 5 CRITICAL issues resolved)

### Strengths
- Clean three-tier architecture (Python CV → .NET business → React UI)
- Proper circuit breaker with state tracking
- Channel-based SSE push (no polling)
- Parameterized queries, no SQL injection
- Quality-gated enrollment with guided 5-pose webcam capture
- Good component extraction and TypeScript strict mode
- SSE heartbeat with backoff, CancellationToken coverage
- All 5 CRITICAL security issues resolved during audit

### Remaining Gaps (Should Fix Before Production)
1. **Python service has no authentication** — anyone reaching port 8000 controls the camera pipeline
2. **Base64 face images in SSE stream** — bandwidth and log persistence concerns
3. **No rate limiting on enrollment** — potential for DB abuse
4. **CapturedAt uses `DateTime.Parse`** — unhandled exception on bad input
5. **Data retention** — no archival or TTL for `gate_events` table

### Worst Remaining Finding
Python service (port 8000) has zero authentication. Any internal host can submit arbitrary embeddings, enroll faces, and view the live camera stream through the unprotected `/stream` endpoint. The service uses the `.NET` API key internally, so unauthenticated callers on the Python side effectively get the `.NET` backend's trust. This is the single highest-priority remaining risk.
