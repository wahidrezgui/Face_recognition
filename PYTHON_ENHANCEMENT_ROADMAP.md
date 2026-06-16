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
- Steps 10–11 are structural refactors — largest scope, done last when all behaviors are verified.

---

## Step 1 — Fix Pose Estimation Bug ✅ VERIFIED

**Files:** `gate_vision_agenthikvision/quality.py`, `gate_vision_agentwebcam/quality.py`  
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

**Files:** `gate_vision_agenthikvision/processing.py`, `gate_vision_agentwebcam/processing.py`  
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

**Files:** `gate_vision_agenthikvision/quality.py`, `gate_vision_agentwebcam/quality.py`, both `config.py`  
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

**Files:** `gate_vision_agenthikvision/detector.py`, `gate_vision_agentwebcam/detector.py`  
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

## Step 6 — Fix Interaction Window Timing + Cap Concurrent Tasks ⬜ TODO

**Files:** `gate_vision_agenthikvision/main.py`, `gate_vision_agentwebcam/main.py`, both `window.py`  
**Risk:** Medium — touches the core capture loop timing logic  
**Accuracy Impact:** Medium — reduces window-close latency at low FPS  

**Problem:**  
1. Window closure is polled inside `_capture_loop()` at detection FPS intervals. At 3 FPS (default), window can stay open 333ms past its expiration. At 1 FPS, up to 1 full second.
2. `asyncio.create_task(_process_snapshot(...))` has no upper bound. Under burst load, many tasks queue simultaneously each holding a numpy frame reference, causing memory spikes.

**What will be changed:**
- Add a standalone `asyncio.create_task(_window_watcher())` background coroutine that runs an `asyncio.sleep(window_duration_ms / 1000)` loop and closes expired windows independently of detection FPS.
- Add `asyncio.Semaphore(5)` (`_snapshot_semaphore`) that limits concurrent in-flight snapshot processing tasks to 5. Tasks that cannot acquire the semaphore drop their snapshot and log a warning.
- Keep existing poll check in `_capture_loop()` as a belt-and-suspenders fallback.

**Verification checklist (for user to confirm):**
- [ ] Window closes within `window_duration_ms + 50ms` regardless of detection FPS
- [ ] Under rapid face detection, no more than 5 snapshot tasks run simultaneously
- [ ] Memory usage is stable under load (no growing frame references)
- [ ] Single-person identification flow is unchanged end-to-end
- [ ] `/stream/status` still reports correct `windows_processed` count

---

## Step 7 — Add API Key Authentication to Python Endpoints ⬜ TODO

**Files:** `gate_vision_agenthikvision/routes.py`, `gate_vision_agentwebcam/routes.py`, both `config.py`  
**Risk:** Medium — adds auth requirement to all management endpoints  
**Security Impact:** Critical — currently any LAN client can stop/restart/enroll  

**Problem:**  
The Python FastAPI service has no authentication. `POST /stop`, `POST /restart`, `POST /enroll/*`, `POST /roi`, and all `/config/*` endpoints are open to any client on the network. The `X-API-Key` header is only sent *from* this service *to* the .NET backend.

**What will be changed:**
- Add `local_api_key: str = ""` to `config.py` (opt-in: if empty, no auth is enforced — preserves current behavior for existing deployments without breaking changes).
- Add FastAPI `Depends` dependency `require_local_api_key(request: Request)` that checks `X-API-Key` header against `settings.local_api_key` when the setting is non-empty.
- Apply the dependency to all mutating endpoints: `/stop`, `/restart`, `/enroll/*`, `/roi`, `/config/*`.
- Read-only endpoints (`/health`, `/stream`, `/metrics`, `/events/recent`) remain open.

**Verification checklist (for user to confirm):**
- [ ] With `GV_LOCAL_API_KEY` unset (empty), all endpoints work without any key (backward compatible)
- [ ] With `GV_LOCAL_API_KEY=test123` set, management endpoints return 401 without the header
- [ ] With correct `X-API-Key: test123` header, management endpoints work normally
- [ ] `/health`, `/stream`, `/metrics` remain accessible without a key
- [ ] `.NET` backend communication is unaffected (it uses its own key)

---

## Step 8 — Encrypt Biometric Data in Local SQLite Buffer ⬜ TODO

**Files:** `gate_vision_agenthikvision/local_buffer.py`, `gate_vision_agentwebcam/local_buffer.py`, both `config.py`  
**Risk:** Low-Medium — replaces plaintext JSON storage with encrypted JSON, no API surface change  
**Security Impact:** High — GDPR/CCPA compliance for biometric data at rest  

**Problem:**  
Face embeddings stored in `gate_events_local.db` are plain JSON. Embeddings are biometric data under GDPR Article 9 and equivalent laws. If the SQLite file is copied or accessed by an unauthorized process, all buffered identities are exposed.

**What will be changed:**
- Add `local_buffer_encryption_key: str = ""` to `config.py` (opt-in, empty = no encryption, backward compatible).
- In `local_buffer.py`: when key is set, encrypt the JSON payload using `cryptography.fernet.Fernet` (symmetric AES-128-CBC with HMAC) before `INSERT` and decrypt on `SELECT`.
- Add `cryptography` to `requirements.txt`.
- Existing unencrypted databases continue to work when the key is empty.

**Verification checklist (for user to confirm):**
- [ ] With no `GV_LOCAL_BUFFER_KEY` set, buffer works exactly as before (plaintext)
- [ ] With key set, buffered events are stored as encrypted blobs (unreadable in SQLite Browser)
- [ ] Drain loop (`drain_local_buffer`) correctly decrypts and replays events
- [ ] Application restart with same key correctly reads existing encrypted events
- [ ] `requirements.txt` updated

---

## Step 9 — Upgrade Tracker to SORT (Kalman Filter + Hungarian Assignment) ⬜ TODO

**Files:** `gate_vision_agenthikvision/main.py`, `gate_vision_agentwebcam/main.py`  
**Risk:** Medium-High — replaces core tracking logic in `_capture_loop()`  
**Accuracy Impact:** Medium — reduces identity switches and spurious duplicate events  

**Problem:**  
Current greedy IoU tracker (threshold 0.15) has no motion prediction and no globally optimal assignment. At 3 FPS, faces move enough between frames that IoU drops below threshold, creating false new tracks and duplicate identification events for the same person.

**What will be changed:**
- Implement a lightweight `KalmanTracker` class within `main.py` tracking `[cx, cy, w, h, vx, vy, vw, vh]` state per track.
- Replace `_match_or_create_track()` with a SORT-style matching loop:
  1. Predict all active track positions forward by one frame using Kalman filter.
  2. Compute IoU between all predictions and new detections.
  3. Use `scipy.optimize.linear_sum_assignment` for globally optimal assignment.
  4. Unmatched tracks enter "lost" state (kept for 3s, not deleted immediately).
  5. Unmatched detections with confidence ≥ 0.5 start new tentative tracks (confirmed after 2 consecutive detections).
- Raise IoU threshold to 0.30 (safe with Kalman prediction since positions are better estimated).
- Add `scipy` to `requirements.txt`.

**Verification checklist (for user to confirm):**
- [ ] Single person walking through frame maintains same `track_id` across frames
- [ ] Two people passing simultaneously get and keep separate `track_id` values
- [ ] Person who briefly disappears (occlusion) resumes same track (within 3s)
- [ ] False detections (e.g., poster, reflection) do not create confirmed tracks
- [ ] `_stats["faces_detected"]` still increments correctly
- [ ] Identification events are not duplicated for a single gate-crossing

---

## Step 10 — Optimize Frame Transfer to Subprocess (Shared Memory) ⬜ TODO

**Files:** `gate_vision_agenthikvision/detector.py`, `gate_vision_agentwebcam/detector.py`  
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

## Step 11 — Consolidate Dual Packages into One ⬜ TODO

**Files:** Entire `gate_vision_agentwebcam/` directory, `docker-compose.yml`, `Dockerfile_1`, `Dockerfile_2`  
**Risk:** High — structural refactor affecting deployment configuration  
**Maintenance Impact:** Critical — currently every fix must be applied twice  

**Problem:**  
`gate_vision_agenthikvision` and `gate_vision_agentwebcam` are identical except that the Hikvision package includes `hikvision.py` and its configuration fields. Every change in this roadmap was applied to both packages. This doubles maintenance cost for all future work.

**What will be changed:**
- Keep `gate_vision_agenthikvision` as the single canonical package, renamed to `gate_vision_ai`.
- Make Hikvision support opt-in: the `HikvisionEventListener` is already only started when `settings.hikvision_url` is non-empty. The webcam use case simply omits the `GV_HIKVISION_URL` env var.
- Delete `gate_vision_agentwebcam/` after confirming the unified package handles both deployment scenarios.
- Update `docker-compose.yml` to use the single package image for both gate types.
- Update `Dockerfile_1` and `Dockerfile_2` to reference the unified package.

**Verification checklist (for user to confirm):**
- [ ] Webcam deployment (no `GV_HIKVISION_URL`) works correctly with the unified package
- [ ] Hikvision deployment (with `GV_HIKVISION_URL` set) works correctly
- [ ] Docker build succeeds for both configurations
- [ ] `docker-compose up` starts both gate services from the same image
- [ ] All routes, endpoints, and behaviors identical to the original split packages

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
| 7 | Add Auth to Python Endpoints | ⬜ TODO | — | — |
| 8 | Encrypt Biometric Data in SQLite Buffer | ⬜ TODO | — | — |
| 9 | Upgrade Tracker to SORT | ⬜ TODO | — | — |
| 10 | Optimize Frame Transfer (Shared Memory) | ⬜ TODO | — | — |
| 11 | Consolidate Dual Packages | ⬜ TODO | — | — |

---

## Current Step: Step 6 — Fix Interaction Window Timing + Cap Concurrent Tasks 🟡

> **Implementation complete.** Please verify using the checklist above, then confirm to proceed to Step 7.
