# GateVision — Interaction-Window Architecture Road Map

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

**Current logic (lines 166–190):**
```python
best_face = max(faces, key=...)
tid = _next_track_id(best_face["bbox"])
# ... confidence guard ...
r = await process_single_face(...)   ← IMMEDIATE per face
```

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

**Global additions to `_state`:**
```python
"window_manager": window_manager,
"scheduler": scheduler,
"interaction_metrics": {...}
```

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

## New KPIs (replace frame-level metrics)

| Metric | Source | Target |
|--------|--------|--------|
| `window_duration_ms` | config | 250 ms |
| `faces_per_window` | window_manager | observed |
| `identities_resolved_per_window` | scheduler | ≤ max_requests |
| `time_to_first_greeting_ms` | scheduler | < 500 ms |
| `time_to_last_greeting_ms` | scheduler | < 1200 ms |

---

## What We Explicitly Do NOT Add

- Kafka or message queues
- Complex multi-object tracker (SORT, DeepSORT)
- Full event sourcing
- New .NET endpoints
- New database tables
- Dashboard changes

The entire change is confined to `gate_vision_ai/` Python layer. .NET and Dashboard are passive consumers of the same API contract.

---

## Execution Order

| # | Step | File(s) | Status |
|---|------|---------|--------|
| 1 | Config knobs | `config.py` | ⬜ PENDING |
| 2 | `InteractionWindowManager` | `window.py` (new) | ⬜ PENDING |
| 3 | `IdentityScheduler` | `window.py` | ⬜ PENDING |
| 4 | Rewire `_capture_loop()` | `main.py` | ⬜ PENDING |
| 5 | Interaction metrics | `main.py`, `routes.py` | ⬜ PENDING |
| 6 | Update PROJECT_MAP.md | `PROJECT_MAP.md` | ⬜ PENDING |

Confirm each step individually. No step begins until the previous one is confirmed.
