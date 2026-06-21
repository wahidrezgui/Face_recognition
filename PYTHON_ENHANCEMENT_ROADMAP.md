# GateVision AI — Python Enhancement Roadmap

> **Workflow:** Each step is implemented → verified by both parties → status updated → next step begins.
> No step is started until the previous one is marked **VERIFIED ✅**.
> The goal is zero broken features at every checkpoint.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ TODO | Not started |
| 🔵 IN PROGRESS | Currently being implemented |
| 🟡 AWAITING VERIFICATION | Code complete, waiting for user to test and confirm |
| ✅ VERIFIED | User confirmed working, roadmap updated |
| ❌ SKIPPED | Deferred or decided against |

---

## Ordering Rationale

Steps are ordered **safest-first, highest-ROI-first**:
- Steps 1–3 are single-function / single-constant changes with zero risk of side effects.
- Steps 4–6 add new logic in contained modules without touching the main capture loop.
- Steps 7–9 touch the capture loop or IPC — require careful regression testing.
- Step 10 is a structural refactor — largest scope, done last when all behaviors are verified.

---

## Step 1 — Fix Pose Estimation Bug ✅ VERIFIED

**Files:** `gate_vision_ai/quality.py`  
**Risk:** Very Low — isolated to `check_quality()`, no downstream API changes  
**Accuracy Impact:** High — the quality gate currently filters on the wrong angle  

**Problem:**  
`check_quality()` calls `yaw_from_landmarks()` which computes `atan2(dy, dx)` from the two eye positions. This measures **in-plane roll** (eye tilt), not horizontal head rotation yaw. Real yaw is already available in `face["pose"][1]` (extracted by the InsightFace worker in `detector.py:114`).

`estimate_pose_from_kps()` exists and is more correct but is only used by the `/pose` route endpoint, not by the quality gate.

**What will be changed:**
- `check_quality()`: replace `yaw_from_landmarks(face["landmarks"])` with `face.get("pose", [0, 0, 0])[1]` (yaw is index 1 in InsightFace pose tuple: `[pitch, yaw, roll]`).
- Add a `pitch` gate alongside yaw using `face.get("pose", [0, 0, 0])[0]` with a configurable `max_pitch` setting (default 30°).
- Keep `yaw_from_landmarks()` as a fallback when `face["pose"]` is `None` or absent (some model profiles may not produce pose).
- Add `max_pitch` to `config.py` with a sensible default.

**Verification checklist (for user to confirm):**
- [ ] `/pose` endpoint still returns correct yaw/pitch values
- [ ] Frontal faces pass quality check
- [ ] Heavily side-angled faces (>35° real yaw) are now correctly rejected
- [ ] Faces tilted in-plane (e.g., head tilt, not turned sideways) are no longer incorrectly rejected
- [ ] `check_quality()` returns `(False, "high_yaw:...")` for genuinely sideways faces
- [ ] No change in `/identify`, `/enroll`, or streaming behavior

---

## Step 2 — Raise Enrollment Clustering Threshold ✅ VERIFIED

**Files:** `scripts/direct_enroll.py`, `scripts/enroll_from_video.py`  
**Risk:** Very Low — scripts only, zero effect on the live pipeline  
**Accuracy Impact:** High — prevents mixed-identity gallery pollution  

**Problem:**  
Both enrollment scripts cluster face embeddings with cosine similarity threshold **0.5**. ArcFace similarity between *different people* can reach 0.55–0.60 on borderline faces, meaning two different people can end up in the same enrollment cluster. This contaminates the identity gallery permanently.

NIST FRVT-validated systems use ≥ 0.65 for same-person determination at 0.1% FAR.

**What will be changed:**
- `direct_enroll.py`: increase clustering threshold constant from `0.5` → `0.65`.
- `enroll_from_video.py`: same constant change.
- Both scripts: add an **intra-cluster minimum similarity guard** — after clustering, verify that every pair within a cluster has similarity ≥ 0.60. If not, split or discard the cluster.
- Both scripts: log inter-cluster maximum similarity as a warning if two clusters are within 0.58 of each other.

**Verification checklist (for user to confirm):**
- [ ] Scripts still run without error
- [ ] Clusters produced are tighter (fewer, more homogeneous)
- [ ] No change in `main.py`, `detector.py`, `processing.py`, or any live route
- [ ] A test enrollment from a mixed-person video produces separate clusters, not one merged cluster

---

## Step 3 — Fix Auto-Improve Memory Leak + Add Quality Gate ✅ VERIFIED

**Files:** `gate_vision_ai/processing.py`  
**Risk:** Low — contained in `processing.py`, no API surface change  
**Accuracy Impact:** Medium — stops gradual gallery degradation over time  

**Problem:**  
1. `_auto_improve_last: dict[str, datetime]` is a module-level dict that grows forever — one entry per unique person ID seen, never purged. Over months this leaks memory.
2. `_background_improve()` re-enrolls any moderate-confidence match with zero image quality check. Moderate confidence is exactly when quality is borderline — re-enrolling blurry frames degrades the gallery.

**What will be changed:**
- Replace `_auto_improve_last` plain dict with a `TTLCache` from `cachetools` (TTL = 300s, max size = 1000 entries). This bounds memory use and auto-expires old entries naturally.
- Add a minimum sharpness check before firing `_background_improve()`: compute `cv2.Laplacian(face_gray, cv2.CV_64F).var()` on the face crop and only re-enroll if variance ≥ 80 (configurable via `auto_improve_min_sharpness` in config).
- Add `cachetools` to `requirements.txt` in both packages.

**Verification checklist (for user to confirm):**
- [ ] Auto-improve still triggers for moderate-confidence matches on sharp frames
- [ ] Auto-improve does not trigger on blurry frames (test with an intentionally blurred frame)
- [ ] `_auto_improve_last` no longer grows beyond 1000 entries
- [ ] No change in `/enroll`, `/identify`, or streaming routes
- [ ] `requirements.txt` updated correctly

---

## Step 4 — Add Face Image Quality Assessment (IQA) Gates ✅ VERIFIED

**Files:** `gate_vision_ai/quality.py`, `gate_vision_ai/config.py`  
**Risk:** Low-Medium — adds new rejection reasons, could increase rejection rate  
**Accuracy Impact:** High — filters the most common source of false negatives  

**Problem:**  
`check_quality()` has no blur, illumination, or brightness check. Blurred faces from fast-moving subjects and over/under-exposed faces at gate crossings pass quality check and produce low-quality embeddings that degrade identification confidence.

**What will be changed:**
- Add `face_sharpness_score(face_gray: np.ndarray) -> float` function: `cv2.Laplacian(gray, cv2.CV_64F).var()`.
- Add `face_brightness_ok(face_gray: np.ndarray) -> bool`: mean pixel value in `[30, 220]`.
- Integrate both into `check_quality()`:
  - Extract face crop from bbox + frame for IQA (we already have the frame reference available in `process_single_face`).
  - Return `(False, "blurry:{score:.1f}")` if sharpness < threshold.
  - Return `(False, "bad_illumination:{mean:.0f}")` if brightness outside range.
- Add `min_sharpness_score: float = 60.0` and `min_brightness: int = 30` / `max_brightness: int = 220` to `config.py`.
- Update `check_quality()` signature to accept `frame` parameter (currently only takes `face` dict).

**Verification checklist (for user to confirm):**
- [ ] Sharp, well-lit frontal faces still pass quality check
- [ ] A blurry face image is correctly rejected with `blurry:` reason
- [ ] An over-exposed image is rejected with `bad_illumination:` reason
- [ ] `_stats["rejected"]` increments correctly for new rejection reasons
- [ ] No change in enrollment or streaming routes
- [ ] `/stream/status` shows updated rejection stats

---

## Step 5 — Fix `embed_crop()` Alignment ✅ VERIFIED

**Files:** `gate_vision_ai/detector.py`  
**Risk:** Low — only affects the fallback path when SCRFD fails on a tight crop  
**Accuracy Impact:** High — aligns the face to ArcFace's training distribution  

**Problem:**  
`_worker_embed_crop()` resizes the crop directly to 112×112 with no landmark alignment. ArcFace was trained on landmarks-aligned crops. Without alignment, the embedding drifts 0.05–0.20 cosine distance units from where it should be, causing identification failures on otherwise good face crops.

**What will be changed:**
- Before calling `embed_crop()` (in `routes.py`), attempt adding 40% padding to the image and re-running `detect()` first. If detection succeeds, use the full pipeline with alignment.
- In `_worker_embed_crop()` (the true fallback): add estimated landmark positions using standard face proportions (eyes at ~30%/70% horizontal, 35% vertical; nose at 50%/55%; mouth corners at 30%/70% horizontal, 70% vertical) and apply `cv2.warpAffine` with an affine transform to the ArcFace canonical 112×112 template.
- Log a `WARNING` every time the `embed_crop()` fallback path is used so the frequency is visible.

**Verification checklist (for user to confirm):**
- [ ] `POST /enroll/from-image` with a tight face crop still succeeds
- [ ] Embedding from tight crop is now closer to enrollment template (confidence improves)
- [ ] Warning log appears when fallback path is taken
- [ ] Normal detection path (SCRFD success) is completely unchanged
- [ ] No regression in `/enroll/webcam` or `/enroll/capture`

---

## Step 6 — Fix Interaction Window Timing + Cap Concurrent Tasks 🟡 AWAITING VERIFICATION

**Files:** `gate_vision_ai/main.py`  
**Risk:** Medium — touches the core capture loop timing logic  
**Accuracy Impact:** Medium — reduces window-close latency at low FPS  

**Problem:**  
1. Window closure is polled inside `_capture_loop()` at detection FPS intervals. At 3 FPS (default), window can stay open 333ms past its expiration. At 1 FPS, up to 1 full second.
2. `asyncio.create_task(_process_snapshot(...))` has no upper bound. Under burst load, many tasks queue simultaneously each holding a numpy frame reference, causing memory spikes.

**What was changed:**
- Added standalone `asyncio.create_task(_window_watcher())` background coroutine that runs an `asyncio.sleep(window_duration_ms / 1000)` loop and closes expired windows independently of detection FPS.
- Added `asyncio.Semaphore(5)` (`_snapshot_semaphore`) that limits concurrent in-flight snapshot processing tasks to 5. Tasks that cannot acquire the semaphore drop their snapshot and log a warning.
- Kept existing poll check in `_capture_loop()` as a belt-and-suspenders fallback.
- `_window_watcher` task is cancelled and awaited in the lifespan shutdown sequence.

**Verification checklist (for user to confirm):**
- [ ] Window closes within `window_duration_ms + 50ms` regardless of detection FPS
- [ ] Under rapid face detection, no more than 5 snapshot tasks run simultaneously
- [ ] Memory usage is stable under load (no growing frame references)
- [ ] Single-person identification flow is unchanged end-to-end
- [ ] `/stream/status` still reports correct `windows_processed` count

---

## Step 7 — Add API Key Authentication to Python Endpoints 🟡 AWAITING VERIFICATION

**Files:** `gate_vision_ai/routes.py`, `gate_vision_ai/config.py`  
**Risk:** Medium — adds auth requirement to all management endpoints  
**Security Impact:** Critical — currently any LAN client can stop/restart/enroll  

**Problem:**  
The Python FastAPI service had no authentication. `POST /stop`, `POST /restart`, `POST /enroll/*`, `POST /roi`, and all `/config/*` endpoints were open to any client on the network. The `X-API-Key` header was only sent *from* this service *to* the .NET backend.

**What was changed:**
- Added `local_api_key: str = ""` to `config.py` (opt-in: if empty, no auth is enforced — preserves current behavior for existing deployments without breaking changes).
- Added FastAPI `Depends` dependency `require_local_api_key(request: Request)` that checks `X-API-Key` header against `settings.local_api_key` when the setting is non-empty.
- Applied the dependency to all mutating endpoints: `/stop`, `/restart`, `/enroll/*`, `/roi`, `/config/*`.
- Read-only endpoints (`/health`, `/stream`, `/metrics`, `/events/recent`) remain open.
- `GV_LOCAL_API_KEY` documented in `.env.example` and added (commented out) in `.env`.

**Verification checklist (for user to confirm):**
- [ ] With `GV_LOCAL_API_KEY` unset (empty), all endpoints work without any key (backward compatible)
- [ ] With `GV_LOCAL_API_KEY=test123` set, management endpoints return 401 without the header
- [ ] With correct `X-API-Key: test123` header, management endpoints work normally
- [ ] `/health`, `/stream`, `/metrics` remain accessible without a key
- [ ] `.NET` backend communication is unaffected (it uses its own key)

---

## Step 8 — Upgrade Tracker to SORT (Kalman Filter + Hungarian Assignment) 🟡 AWAITING VERIFICATION

**Files:** `gate_vision_ai/main.py`  
**Risk:** Medium-High — replaces core tracking logic in `_capture_loop()`  
**Accuracy Impact:** Medium — reduces identity switches and spurious duplicate events  

**Problem:**  
The greedy IoU tracker (threshold 0.15) had no motion prediction and no globally optimal assignment. At 3 FPS, faces move enough between frames that IoU dropped below threshold, creating false new tracks and duplicate identification events for the same person.

**What was changed:**
- Implemented `_KalmanTrack` class within `main.py` tracking `[cx, cy, w, h, vx, vy, vw, vh]` state per track with tentative/confirmed state machine (≥2 consecutive detections to confirm).
- Replaced `_match_or_create_track()` with `_SORTTracker` class using:
  1. Kalman predict step run on all active tracks each frame.
  2. IoU matrix between all predictions and new detections.
  3. `scipy.optimize.linear_sum_assignment` for globally optimal assignment.
  4. Unmatched tracks enter "lost" state (kept for 3s, not deleted immediately).
  5. Unmatched detections with confidence ≥ 0.5 start new tentative tracks.
- Raised IoU threshold to 0.30 (safe with Kalman prediction since positions are better estimated).
- Only confirmed tracks reach the window manager — tentative tracks are suppressed.
- Added `scipy>=1.13.0` to `requirements.txt` and `pyproject.toml`.

**Verification checklist (for user to confirm):**
- [ ] Single person walking through frame maintains same `track_id` across frames
- [ ] Two people passing simultaneously get and keep separate `track_id` values
- [ ] Person who briefly disappears (occlusion) resumes same track (within 3s)
- [ ] False detections (e.g., poster, reflection) do not create confirmed tracks
- [ ] `_stats["faces_detected"]` still increments correctly
- [ ] Identification events are not duplicated for a single gate-crossing

---

## Step 9 — Optimize Frame Transfer to Subprocess (Shared Memory) 🟡 AWAITING VERIFICATION

**Files:** `gate_vision_ai/detector.py`  
**Risk:** Medium — replaces IPC mechanism in `DetectorPool`, requires Python 3.8+  
**Performance Impact:** High — eliminates 12MB serialization overhead per frame at 1080p  

**Problem:**  
Every `detector.detect()` call performs `frame.tobytes()` (6MB copy) + IPC transfer + `np.frombuffer(...).copy()` (another 6MB) = 12MB allocated and discarded per detection. At 5 FPS, this is 60MB/s of unnecessary allocation.

**What will be changed:**
- Allocate a `multiprocessing.shared_memory.SharedMemory` block at startup sized to the maximum expected frame (e.g., 1920×1080×3 bytes).
- Main process writes frame into shared memory before submitting the job.
- Worker reads directly from the shared memory block without copying.
- Fall back to `tobytes()` / `frombuffer()` if shared memory allocation fails (keeps backward compatibility).
- Worker result (face list) remains as regular IPC (it's tiny — a few KB).

**Verification checklist (for user to confirm):**
- [ ] Detection still works correctly at 1080p and 720p
- [ ] Detection still works correctly with ROI crop applied
- [ ] Memory usage (RSS) during continuous detection is measurably lower
- [ ] No regression on detection accuracy or confidence values
- [ ] Graceful fallback if shared memory cannot be allocated (log warning, use copy path)

---

## Step 10 — Consolidate Dual Packages into One ✅ COMPLETE

**Files:** Renamed `gate_vision_agenthikvision/` → `gate_vision_ai/`, deleted `gate_vision_agentwebcam/`  
**Risk:** High — structural refactor affecting deployment configuration  
**Maintenance Impact:** Critical — currently every fix must be applied twice  

**Problem:**  
`gate_vision_agenthikvision` and `gate_vision_agentwebcam` are identical except that the Hikvision package includes `hikvision.py` and its configuration fields. Every change in this roadmap was applied to both packages. This doubles maintenance cost for all future work.

**What was changed:**
- Renamed `gate_vision_agenthikvision/` → `gate_vision_ai/` via `git mv`.
- Deleted `gate_vision_agentwebcam/` — all Steps 1–9 had already been applied to both packages so no code was lost.
- Fixed `pyproject.toml` `package-dir` mapping for the flat-layout structure and added `scipy`/`cachetools` to declared dependencies.
- Updated `.env.example` to document all settings including `GV_LOCAL_API_KEY` (Step 7) and gate/port settings.
- Hikvision support is opt-in via `GV_HIKVISION_URL` — omit it for webcam-only deployments.
- `docker-compose.yml` had no Python services — no change needed. Both inner `Dockerfile`s already referenced `gate_vision_ai` — no change needed.

**Verification checklist (for user to confirm):**
- [ ] Webcam deployment (no `GV_HIKVISION_URL`) works correctly with the unified package
- [ ] Hikvision deployment (with `GV_HIKVISION_URL` set) works correctly
- [ ] Docker build succeeds for both configurations
- [ ] `docker-compose up` starts both gate services from the same image
- [ ] All routes, endpoints, and behaviors identical to the original split packages

---

## Bonus Fix — Event-Loop Blocking in `/enroll` ✅ FIXED

**File:** `gate_vision_ai/routes.py`  
**Found by:** Senior architect review (post-roadmap)  
**Risk:** Low — isolated to enrollment endpoints, no streaming or identify path affected  

**Problem:**  
`det.detect(frame)` was called directly inside `async def enroll()` without `asyncio.to_thread()`. This blocked the entire event loop (and all active HTTP connections) for the ~200–500ms the ONNX worker takes per frame. Same issue existed in `_run_enrollment_from_camera` for both `capture.read_frame()` and `detector.detect(frame)`.

**What was changed:**
- `/enroll` endpoint: `det.detect(frame)` → `await asyncio.to_thread(det.detect, frame)` for each frame in the request body loop.
- `_run_enrollment_from_camera`: wrapped both `capture.read_frame()` and `detector.detect(frame)` with `await asyncio.to_thread(...)`.
- `/enroll/webcam` was already correct — no change needed there.

---

## Step 11 — Fix Kalman Track Hit-Confirmation Threshold ✅ VERIFIED

**Files:** `gate_vision_ai/main.py`  
**Risk:** Very Low — isolated to `_KalmanTrack`, no IPC or API surface change  
**Accuracy Impact:** High — the tentative-track suppression added in Step 8 is currently a no-op

**Problem:**  
`_KalmanTrack.update()` sets `self.confirmed = True` when `self.hits >= 1`. However, `_SORTTracker._spawn()` immediately calls `t.update(bbox, now)` on the newly created track, which sets `hits = 1` — so the `hits >= 1` condition is satisfied on the very first frame. **Every new detection is instantly confirmed.** The Step 8 roadmap promised "≥2 consecutive detections to confirm", but the implementation delivers 1. False detections (posters, reflections, lens flare) go straight to the window manager without needing to survive a second frame.

**What was changed:**
- `_KalmanTrack.update()`: `if self.hits >= 1:` → `if self.hits >= settings.min_track_hits:` (reads from config, default 2).
- `_SORTTracker._spawn()`: removed the `t.update(bbox, now)` call. `__init__` already seeds the Kalman state from bbox. `_spawn()` now sets `t.last_seen = now` and `t.hits = 1` directly — track is tentative until it matches in a subsequent frame.
- Added `min_track_hits: int = 2` to `config.py` (env var `GV_MIN_TRACK_HITS`).

**Verification checklist (for user to confirm):**
- [ ] A face visible in exactly one frame does NOT trigger an identification event
- [ ] A face visible across two or more frames IS confirmed and reaches the window manager
- [ ] A static image or reflection (only detected once) is correctly suppressed
- [ ] Multi-person tracking still assigns separate track IDs correctly

---

## Step 12 — Remove Duplicate Sharpness Computation ✅ VERIFIED

**Files:** `gate_vision_ai/processing.py`, `gate_vision_ai/quality.py`  
**Risk:** Zero — pure refactor, no logic change  
**Maintenance Impact:** Low — eliminates silent divergence between two identical functions

**Problem:**  
`_face_sharpness(frame, bbox)` in `processing.py` (lines 17–25) is byte-for-byte identical to `face_sharpness_score(frame, bbox)` in `quality.py` (lines 34–42). Both compute `cv2.Laplacian(gray, cv2.CV_64F).var()` on the same face crop. If the sharpness logic ever needs tuning (e.g., switching to a Brenner gradient or a frequency-domain measure), both copies must be updated or they silently diverge.

**What to change:**
- Delete `_face_sharpness()` from `processing.py`.
- Add `from .quality import face_sharpness_score` to `processing.py`.
- Replace the one call site in `process_single_face`: `sharpness = _face_sharpness(frame, face["bbox"])` → `sharpness = face_sharpness_score(frame, face["bbox"])`.

**Verification checklist (for user to confirm):**
- [ ] Auto-improve sharpness gate still triggers correctly
- [ ] No `NameError` at runtime
- [ ] No change in identification or enrollment behavior

---

## Step 13 — Make CORS Origins Configurable ✅ VERIFIED

**Files:** `gate_vision_ai/main.py`, `gate_vision_ai/config.py`  
**Risk:** Very Low — additive config change, default preserves current behavior  
**Security Impact:** Medium — hardcoded `localhost:3000` cannot be adapted to production dashboard URLs

**Problem:**  
`allow_origins=["http://localhost:3000"]` is hardcoded in the FastAPI middleware definition (`main.py:460`). A gate device deployed behind a corporate LAN, with the dashboard hosted at a different origin (e.g. `http://192.168.1.10:3000` or `https://gates.internal`), will block all dashboard CORS requests. There is no way to override this without editing source code.

**What to change:**
- Add `cors_origins: str = "http://localhost:3000"` to `config.py` (env var `GV_CORS_ORIGINS`; comma-separated for multiple origins).
- In `main.py`, parse `settings.cors_origins.split(",")` and pass the resulting list to `CORSMiddleware`.
- Document `GV_CORS_ORIGINS` in `.env.example`.

**Verification checklist (for user to confirm):**
- [ ] Default behavior (`localhost:3000`) unchanged when `GV_CORS_ORIGINS` is not set
- [ ] Setting `GV_CORS_ORIGINS=http://192.168.1.10:3000` allows requests from that origin
- [ ] Setting multiple comma-separated origins works correctly
- [ ] Invalid or missing header still returns CORS error from a disallowed origin

---

## Step 14 — Persist SQLite Connection in LocalEventBuffer ✅ VERIFIED

**Files:** `gate_vision_ai/local_buffer.py`  
**Risk:** Low — internal implementation change, same public API  
**Performance Impact:** Medium — eliminates repeated open/close overhead under burst load

**Problem:**  
`LocalEventBuffer.enqueue()`, `dequeue_batch()`, and `pending_count()` each create and destroy a `sqlite3.connect()` connection on every call. When the circuit breaker opens (e.g. backend goes down), every incoming face detection triggers `enqueue()`. At 5 FPS with 1 face per frame, this is 5 connection create/destroy cycles per second — unnecessary overhead that adds latency to the hot identification path.

**What to change:**
- Open one persistent `sqlite3.Connection` at `__init__` time with `check_same_thread=False` and `isolation_level=None` (autocommit disabled).
- Enable WAL journal mode on first open: `conn.execute("PRAGMA journal_mode=WAL")`.
- Replace the per-method `sqlite3.connect()`/`conn.close()` pattern with the shared `self._conn` protected by the existing `self._lock`.
- Keep the same `threading.Lock()` — it already serializes all access correctly.

**Verification checklist (for user to confirm):**
- [ ] Events are correctly enqueued when backend is down
- [ ] `dequeue_batch()` returns and deletes the correct rows
- [ ] `pending_count()` reflects the true queue depth
- [ ] No `sqlite3.ProgrammingError` under concurrent access

---

## Step 15 — Deduplicate Near-Identical Embeddings Before Enrollment ✅ VERIFIED

**Files:** `gate_vision_ai/routes.py`, `gate_vision_ai/embedder.py`  
**Risk:** Low — only affects enrollment, no identification path change  
**Accuracy Impact:** Medium — forces gallery diversity; avoids storing 10 nearly identical embeddings from a static subject

**Problem:**  
`/enroll/webcam` and `_run_enrollment_from_camera` collect multiple frames and send all accepted embeddings to the backend. If the person stands still for 5 frames, all 5 embeddings have cosine similarity ≥ 0.97 — the gallery ends up with near-duplicates rather than diverse pose/lighting samples. This reduces the gallery's ability to handle variation at identification time and wastes storage.

**What to change:**
- Add `deduplicate_embeddings(embeddings: list[np.ndarray], max_sim: float = 0.95) -> list[np.ndarray]` to `embedder.py`. For each candidate, compute cosine similarity against all already-accepted embeddings; only add it if `max(similarities) < max_sim`.
- Call `deduplicate_embeddings(accepted_embs)` at the end of both `/enroll/webcam` and `_run_enrollment_from_camera` before the backend call.
- Add `enroll_dedup_threshold: float = 0.95` to `config.py` (0 = disabled).
- Log the number of embeddings dropped as duplicates.

**Verification checklist (for user to confirm):**
- [ ] Enrolling with 10 frames of a still subject produces fewer than 10 embeddings sent to backend
- [ ] Enrolling with varied poses (frontal, slight left, slight right) preserves all 3
- [ ] No regression in `/enroll/from-image` (single-embedding path, dedup doesn't apply)
- [ ] `accepted` count in the response reflects post-dedup count

---

## Step 16 — Use `INTER_AREA` for Motion Detection Downscale ✅ VERIFIED

**Files:** `gate_vision_ai/main.py`  
**Risk:** Zero — one-constant change, purely within the motion gate branch  
**Accuracy Impact:** Low-Medium — reduces block-artifact false positives in the motion gate

**Problem:**  
The motion gate downscaled each frame to 160×120 using `cv2.INTER_NEAREST` (`main.py:336`). Nearest-neighbour at a ≥6× downscale ratio (1080p → 160×120) introduced heavy block artifacts — adjacent output pixels corresponded to very different source pixels, creating pixel-level variation in static scenes that exceeded `motion_pixel_threshold` and caused spurious motion gate triggers.

**What was changed:**
- `main.py:336`: changed `interpolation=cv2.INTER_NEAREST` → `interpolation=cv2.INTER_AREA`.  
  Note: `INTER_AREA` (pixel-averaging box filter) was chosen over the originally planned `INTER_LINEAR` because it is the correct OpenCV method for large-ratio downscaling — it averages all source pixels within each output cell, fully eliminating aliasing rather than just reducing it.

**Verification checklist (for user to confirm):**
- [ ] Static scene (no movement) no longer triggers motion gate spuriously
- [ ] Real motion (person walking) still triggers the motion gate
- [ ] `motion_skipped` counter behaves correctly

---

## Step 17 — Add Anti-Spoofing / Liveness Detection ⬜ TODO

**Files:** `gate_vision_ai/detector.py`, `gate_vision_ai/quality.py`, `gate_vision_ai/config.py`  
**Risk:** Medium — adds a new quality rejection path; real faces should not be affected  
**Security Impact:** Critical — currently any printed photo or on-screen replay succeeds

**Problem:**  
The identification pipeline has no liveness check. A printed photo held up to the camera, a screen displaying a video replay, or a 3D mask would currently pass all quality gates (sharpness, brightness, pose) and produce a valid embedding that could match an enrolled person. For a physical access control system, this is the most critical missing security layer.

InsightFace bundles an anti-spoofing model (`miniFASNet` or similar) that outputs a real/spoof confidence score per face. It is lightweight enough to run on CPU without significant latency impact.

**What to change:**
- In `_worker_init()`: load the anti-spoofing model via `FaceAnalysis` with the `anti_spoof` model included, or load it separately as a standalone ONNX model.
- In `_worker_detect()` / `_worker_detect_shm()`: run anti-spoof inference on each detected face; add `face["spoof_score"]` (0.0 = spoof, 1.0 = live) to the result dict.
- In `check_quality()` (`quality.py`): add a `spoof_score` check — return `(False, "spoof:{score:.2f}")` if `face.get("spoof_score", 1.0) < settings.min_liveness_score`.
- Add `min_liveness_score: float = 0.6` and `anti_spoof_enabled: bool = True` to `config.py`.

**Verification checklist (for user to confirm):**
- [ ] A real face held in front of the camera passes the liveness check
- [ ] A photo of a face shown to the camera is rejected with `spoof:` reason
- [ ] `anti_spoof_enabled=False` disables the check entirely (backward compatible)
- [ ] `_stats["rejected"]` increments for spoof rejections
- [ ] Performance: liveness check adds ≤50ms per frame on CPU

---

## Step 18 — Make SORT Max-Lost Duration Configurable ✅ VERIFIED

**Files:** `gate_vision_ai/main.py`, `gate_vision_ai/config.py`  
**Risk:** Very Low — additive config change, existing 3s behavior is the default  
**Correctness Impact:** Low-Medium — ghost tracks that stay alive too long can delay window closure

**Problem:**  
`_SORTTracker._MAX_LOST_S = 3.0` is a hardcoded class constant. For a gate camera 1–2m from a doorway, a person who walks through takes ~0.5–1s in frame. Keeping their track alive for 3 full seconds after they leave means the window manager may still have an "active track" signal long after the face is gone, holding window state or creating stale candidates. Deployments where the camera has a wide field of view (e.g. a corridor) may want longer persistence; tight gate crops want shorter.

**What was changed:**
- Added `tracker_max_lost_s: float = 3.0` to `config.py` (env var `GV_TRACKER_MAX_LOST_S`).
- Removed `_MAX_LOST_S` class constant from `_SORTTracker`; `__init__` now sets `self._max_lost_s = settings.tracker_max_lost_s`.
- `update()` now references `self._max_lost_s`.
- `GV_TRACKER_MAX_LOST_S` added (commented out, default 3.0) to both `.env` and `.env.example` with deployment guidance.
- Full stack: `TrackerMaxLostS` column added via migration `030_AddTrackerMaxLostSToGates.sql`, property added to `Gate.cs` (min-clamped to 0.5s), field added to `GateConfigUpdate.cs`, wired into `BuildGateConfigDto` / admin list / PATCH handler in `GateEndpoints.cs`, and mapped in `config_loader.py`. Env var always takes priority over DB value.

**Verification checklist (for user to confirm):**
- [ ] Default behavior (3s) unchanged when setting is not provided
- [ ] Setting `GV_TRACKER_MAX_LOST_S=1.0` causes tracks to expire in 1s
- [ ] No regression in multi-person tracking

---

## Progress Tracker

| Step | Title | Status | Verified By | Date |
|------|-------|--------|-------------|------|
| 1 | Fix Pose Estimation Bug | ✅ VERIFIED | wahidrezgui | 2026-06-16 |
| 2 | Raise Enrollment Clustering Threshold | ✅ VERIFIED | wahidrezgui | 2026-06-16 |
| 3 | Fix Auto-Improve Memory Leak + Quality Gate | ✅ VERIFIED | wahidrezgui | 2026-06-16 |
| 4 | Add IQA Gates (Blur + Brightness) | ✅ VERIFIED | wahidrezgui | 2026-06-16 |
| 5 | Fix `embed_crop()` Alignment | ✅ VERIFIED | wahidrezgui | 2026-06-16 |
| 6 | Fix Window Timing + Cap Concurrent Tasks | 🟡 AWAITING VERIFICATION | — | — |
| 7 | Add Auth to Python Endpoints | 🟡 AWAITING VERIFICATION | — | — |
| 8 | Upgrade Tracker to SORT | 🟡 AWAITING VERIFICATION | — | — |
| 9 | Optimize Frame Transfer (Shared Memory) | 🟡 AWAITING VERIFICATION | — | — |
| 10 | Consolidate Dual Packages | ✅ COMPLETE | — | 2026-06-17 |
| 11 | Fix Kalman Track Hit-Confirmation Threshold | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 12 | Remove Duplicate Sharpness Computation | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 13 | Make CORS Origins Configurable | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 14 | Persist SQLite Connection in LocalEventBuffer | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 15 | Deduplicate Near-Identical Embeddings Before Enrollment | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 16 | Use `INTER_AREA` for Motion Detection Downscale | ✅ VERIFIED | wahidrezgui | 2026-06-18 |
| 17 | Add Anti-Spoofing / Liveness Detection | ⬜ TODO | — | — |
| 18 | Make SORT Max-Lost Duration Configurable | ✅ VERIFIED | wahidrezgui | 2026-06-18 |

---

## All Steps Complete — Awaiting Verification
