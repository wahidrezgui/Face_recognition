# gate_vision_ai — Remaining Enhancement Proposals

## What Has Been Implemented

The following optimisations are already in production in the codebase:

| # | Enhancement | Files changed |
|---|-------------|---------------|
| 1 | **Auto model profile** — `buffalo_s` + 320×320 on CPU/DirectML/OpenVINO; `buffalo_l` + 640×640 on CUDA | `detector.py`, `config.py`, `routes.py` |
| 2 | **Independent det_size override** — `detector_input_size` decoupled from model profile | `detector.py`, `config.py`, `routes.py` |
| 3 | **Provider chain** — CUDA → DirectML → OpenVINO → CPU, probed at startup | `detector.py`, `pyproject.toml`, `Dockerfile` |
| 4 | **Motion-gated detection** — pixel diff on 160×120 gray; skips inference on static frames | `main.py`, `config.py`, `routes.py` |
| 5 | **Subprocess isolation** — `ProcessPoolExecutor` moves ONNX inference out of the asyncio event loop | `detector.py`, `main.py` |
| 8 | **Frame downscale before detection** — `detect_max_width` resizes the detection copy; stream stays at full resolution | `main.py`, `config.py`, `routes.py` |

---

## Remaining Enhancements

These three enhancements have not yet been implemented. All work fully in a closed local network — none require internet access at runtime.

---

### Enhancement 6 — ONNX Model Quantization (INT8)

**What:** Quantize the InsightFace ONNX model files from FP32 to INT8 using `onnxruntime.quantization` — a one-time offline step run on any machine, producing new `.onnx` files.

**Why it works in a closed network:** Quantisation is done entirely locally as a build step before deployment. The resulting model files are self-contained. No runtime internet access is needed.

**Impact:**
- INT8 models run **2–4× faster** on CPUs with AVX-512 or VNNI (Intel Cascade Lake+, AMD Zen 4, most modern server CPUs).
- Memory footprint of the recognition model drops from ~170 MB to ~45 MB — significant on machines with limited RAM.
- No code changes at inference time — only the `.onnx` file path changes.
- Accuracy loss on frontal face recognition is under 1% with proper calibration.

**How to apply:**
1. Collect 50–100 representative face images as a calibration dataset.
2. Run `onnxruntime.quantization.quantize_static()` on each InsightFace model file.
3. Point InsightFace at the quantised models via `root` parameter in `FaceAnalysis`.
4. The existing `DetectorPool` picks them up automatically — no other code changes.

**Where to hook in:** `detector.py` — `_worker_init()` already calls `FaceAnalysis(name=model_pkg)`. Adding a `root` kwarg pointing to the quantised model directory is the only change needed.

---

### Enhancement 7 — Adaptive FPS Based on Worker Latency

**What:** Measure how long each `_worker_detect()` call actually takes and dynamically lower `processing_fps` when inference is taking longer than the current interval allows, then raise it again when latency improves.

**Why it works in a closed network:** Uses only local timing data — no external monitoring service. No internet access required.

**Impact:**
- Prevents the detection loop from queueing frames faster than the subprocess can consume them. Without this, on a slow CPU, pending `executor.submit()` calls pile up, causing unbounded latency growth.
- Makes the service self-tuning — operators do not need to manually set `processing_fps` for each deployment hardware.
- On a capable machine, fps drifts back up automatically; on a loaded machine, it backs off gracefully.

**How to apply:**
1. Record `time.perf_counter()` before and after each `executor.submit().result()` call inside `DetectorPool.detect()`.
2. Expose a rolling average latency via `DetectorPool.last_inference_ms`.
3. In `_capture_loop`, compare `last_inference_ms` against the current `detect_interval`. If inference is taking longer than 85% of the interval, halve `processing_fps` (floor at 1). If it is taking less than 40% of the interval and fps is below the configured maximum, raise it by 1.
4. Add `GET /config/adaptive-fps` to expose the current auto-adjusted fps and the measured latency.

**Config to add:** `adaptive_fps_enabled: bool = True`, `adaptive_fps_max: int = 10`.

---

### Enhancement 10 — ONVIF Metadata Stream Support

**What:** Add an optional ingestion mode where `gate_vision_ai` reads structured detection events from an ONVIF Profile T compatible IP camera instead of running local inference on a raw video stream.

**Why it works in a closed network:** ONVIF is a LAN-level camera protocol (XML/SOAP over HTTP on the local subnet). It requires no internet, no cloud. It is the standard protocol used by enterprise IP cameras (Hikvision, Dahua, Axis, Bosch, Sony) specifically designed for closed-network deployments.

**Impact:**
- Eliminates local inference entirely for cameras that already have onboard face detection NPUs. The camera sends structured events (bounding boxes, face crops, track IDs) and `gate_vision_ai` only needs to run the lightweight identity matching step.
- CPU load on the host machine drops from ~100% of one core at 3 FPS to near zero — the NPU in the camera does the work.
- This is the correct long-term architecture for a production gate system. The host becomes a simple identity broker rather than a vision processor.

**What ONVIF Profile T provides:**
- Analytics events: person detected, face detected, bounding box, track ID
- Face crops as JPEG thumbnails (optional, camera-dependent)
- Configurable rules (zone entry, dwell time, direction)

**How to apply:**
1. Add a new capture mode: `camera_source = "onvif://ip:port"` is detected by `CameraCapture` and routes to a new `OnvifEventCapture` class instead of `cv2.VideoCapture`.
2. `OnvifEventCapture` uses `python-onvif-zeep` (a pure-Python ONVIF client, no internet needed) to subscribe to the camera's analytics event stream.
3. Each analytics event from the camera maps to a face dict with `bbox`, `confidence`, and optionally `embedding` (if the camera sends a face crop, extract the embedding locally).
4. The rest of the pipeline — tracking, window manager, identity resolution — continues unchanged.

**Package required:** `python-onvif-zeep` (installable offline from wheel; ~200 KB pure-Python library, no binary dependencies).

---

## Summary

| # | Enhancement | CPU impact | Effort | Network requirement |
|---|-------------|-----------|--------|---------------------|
| 6 | INT8 quantization | 2–4× faster inference | Medium | None (offline build step) |
| 7 | Adaptive FPS | Stability under load | Low | None (local timing) |
| 10 | ONVIF camera events | Near-zero inference cost | High | Local LAN only |

**Recommended next step:** Enhancement 7 is the lowest-effort change and immediately improves reliability on any CPU-only deployment by preventing latency runaway when the machine is under load. Enhancement 6 follows as a one-time build step that compounds with all existing optimisations.
