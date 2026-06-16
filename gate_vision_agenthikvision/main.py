import logging
import os
import time
import asyncio
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import cv2
import httpx
import numpy as np
from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .capture import CameraCapture
from .detector import DetectorPool
from .client import NetBackendClient
from .hikvision import HikvisionEventListener
from .window import InteractionWindowManager, IdentityScheduler
from .routes import register_routes

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("gate_vision_ai")

# Fetch gate processing config from the .NET API at startup.
# Env vars (GV_*) always take priority — the API fills in everything else.
# Retries up to 5 times with 2s delay to handle the case where the .NET API
# starts slightly after the Python service.
_gate_id = settings.gate_id
if _gate_id and _gate_id != "default":
    _cfg_url = f"{settings.net_backend_url}/api/v1/gates/{_gate_id}/config"
    _cfg_headers = {"X-API-Key": settings.net_api_key} if settings.net_api_key else {}
    _cfg: dict | None = None
    for _attempt in range(1, 6):
        try:
            _resp = httpx.get(_cfg_url, headers=_cfg_headers, timeout=5.0)
            if _resp.status_code == 200:
                _cfg = _resp.json()
                break
            logger.warning("Gate config fetch attempt %d/%d returned HTTP %d — retrying in 2s",
                           _attempt, 5, _resp.status_code)
        except Exception as _e:
            logger.warning("Gate config fetch attempt %d/%d failed (%s) — retrying in 2s",
                           _attempt, 5, _e)
        if _attempt < 5:
            time.sleep(2)

    if _cfg is not None:
        _ENV = os.environ
        if "camera_source" in _cfg and "GV_CAMERA_SOURCE" not in _ENV:
            settings.camera_source = str(_cfg["camera_source"])
        if "direction" in _cfg and "GV_DIRECTION" not in _ENV:
            settings.direction = str(_cfg["direction"])
        if "processing_fps" in _cfg and "GV_PROCESSING_FPS" not in _ENV:
            settings.processing_fps = int(_cfg["processing_fps"])
        if "model_profile" in _cfg and "GV_MODEL_PROFILE" not in _ENV:
            settings.model_profile = str(_cfg["model_profile"])
        if _cfg.get("detector_input_size") and "GV_DETECTOR_INPUT_SIZE" not in _ENV:
            settings.detector_input_size = tuple(_cfg["detector_input_size"])
        if "motion_threshold" in _cfg and "GV_MOTION_THRESHOLD" not in _ENV:
            settings.motion_threshold = float(_cfg["motion_threshold"])
        if "motion_pixel_threshold" in _cfg and "GV_MOTION_PIXEL_THRESHOLD" not in _ENV:
            settings.motion_pixel_threshold = int(_cfg["motion_pixel_threshold"])
        if "detect_max_width" in _cfg and "GV_DETECT_MAX_WIDTH" not in _ENV:
            settings.detect_max_width = int(_cfg["detect_max_width"])
        if "hikvision_url" in _cfg and "GV_HIKVISION_URL" not in _ENV:
            settings.hikvision_url = str(_cfg["hikvision_url"])
        if "hikvision_user" in _cfg and "GV_HIKVISION_USER" not in _ENV:
            settings.hikvision_user = str(_cfg["hikvision_user"])
        if "hikvision_password" in _cfg and "GV_HIKVISION_PASSWORD" not in _ENV:
            settings.hikvision_password = str(_cfg["hikvision_password"])
        if "hikvision_event_ttl_ms" in _cfg and "GV_HIKVISION_EVENT_TTL_MS" not in _ENV:
            settings.hikvision_event_ttl_ms = int(_cfg["hikvision_event_ttl_ms"])
        if "hikvision_event_types" in _cfg and "GV_HIKVISION_EVENT_TYPES" not in _ENV:
            settings.hikvision_event_types = str(_cfg["hikvision_event_types"])
        if "hikvision_detection_target" in _cfg and "GV_HIKVISION_DETECTION_TARGET" not in _ENV:
            settings.hikvision_detection_target = str(_cfg["hikvision_detection_target"])
        if "min_face_confidence" in _cfg and "GV_MIN_FACE_CONFIDENCE" not in _ENV:
            settings.min_face_confidence = float(_cfg["min_face_confidence"])
            settings.detector_confidence = float(_cfg["min_face_confidence"])
        if "identify_confidence_threshold" in _cfg and "GV_IDENTIFY_CONFIDENCE_THRESHOLD" not in _ENV:
            settings.auto_improve_max_conf = float(_cfg["identify_confidence_threshold"])
        if "min_match_score" in _cfg and "GV_MIN_MATCH_SCORE" not in _ENV:
            settings.auto_improve_min_conf = max(0.55, float(_cfg["min_match_score"]) + 0.05)
        logger.info(
            "Gate config loaded from API — gate=%s  camera=%s  fps=%d  direction=%s  "
            "hikvision=%s  motion_threshold=%.3f  detect_max_width=%d  "
            "min_face_conf=%.2f  identify_threshold=%.2f",
            _gate_id, settings.camera_source, settings.processing_fps, settings.direction,
            settings.hikvision_url or "(none)", settings.motion_threshold, settings.detect_max_width,
            settings.min_face_confidence, settings.auto_improve_max_conf,
        )
    else:
        logger.error("Gate config could not be fetched after 5 attempts — running with env/defaults "
                     "(camera=%s, fps=%d)", settings.camera_source, settings.processing_fps)
else:
    logger.warning("GV_GATE_ID not set — skipping API config fetch, using env/defaults")

capture: CameraCapture | None = None
detector: DetectorPool | None = None
backend: NetBackendClient | None = None

_last_process_time: float = 0
_events_log: deque = deque(maxlen=100)
_stats = {"frames_captured": 0, "faces_detected": 0, "events_sent": 0, "rejected": 0, "backend_errors": 0, "circuit_open": False, "windows_processed": 0, "motion_skipped": 0}
_latest_frame_jpg: bytes | None = None
_motion_prev_gray: np.ndarray | None = None  # previous downscaled gray frame for motion gate

_roi: dict = {"x": settings.roi_x, "y": settings.roi_y, "width": settings.roi_width, "height": settings.roi_height}

# Bbox-based face tracker: maps track_id → {bbox, last_seen (time.time())}
_active_tracks: dict[int, dict] = {}
_track_counter: int = 0
_TRACK_IOU_THRESHOLD: float = 0.15   # min overlap to count as same track
_TRACK_EXPIRY_S: float = 3.0         # drop track after 3s of no updates
_window_manager = InteractionWindowManager(settings.window_duration_ms)
_scheduler = IdentityScheduler(settings.max_identity_requests_per_window, settings.greeting_delay_ms)


def _bbox_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    x1 = max(ax1, bx1); y1 = max(ay1, by1)
    x2 = min(ax2, bx2); y2 = min(ay2, by2)
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _match_or_create_track(bbox: list[float], now: float) -> int:
    """Match bbox against all active tracks (highest IoU wins). Creates a new track if no match."""
    global _track_counter
    # Expire tracks that haven't been seen recently
    expired = [tid for tid, d in _active_tracks.items() if now - d["t"] > _TRACK_EXPIRY_S]
    for tid in expired:
        del _active_tracks[tid]
    # Find the active track with the best IoU
    best_tid, best_iou = None, _TRACK_IOU_THRESHOLD
    for tid, d in _active_tracks.items():
        iou = _bbox_iou(bbox, d["bbox"])
        if iou > best_iou:
            best_iou, best_tid = iou, tid
    if best_tid is not None:
        _active_tracks[best_tid] = {"bbox": bbox, "t": now}
        return best_tid
    # No match — start a new track
    _track_counter += 1
    _active_tracks[_track_counter] = {"bbox": bbox, "t": now}
    logger.debug("New track %d created (active: %d)", _track_counter, len(_active_tracks))
    return _track_counter

# Mutable container for route closures (captured by reference at import time)
_state = {
    "capture": None,
    "detector": None,
    "backend": None,
    "hikvision": None,
    "stats": _stats,
    "events_log": _events_log,
    "latest_frame_jpg": _latest_frame_jpg,
    "roi": _roi,
    "stream_connections": 0,
    "processing_fps": settings.processing_fps,
}


async def _process_snapshot(snapshot, backend) -> None:
    global _stats
    results = await _scheduler.schedule(snapshot, settings.direction, backend)
    window_ms = (snapshot.window_end - snapshot.window_start) * 1000
    _stats["windows_processed"] += 1

    for identity_result in results:
        r = identity_result.result
        if isinstance(r, Exception):
            logger.error("Face processing error: %s", r)
        elif r.get("circuit_open"):
            _stats["circuit_open"] = True
        elif r.get("backend_down"):
            _stats["backend_errors"] += 1
        elif r.get("quality"):
            _stats["events_sent"] += 1
            _stats["circuit_open"] = False
            _events_log.append({
                "timestamp": snapshot.persons[0].timestamp if snapshot.persons else "",
                "confidence": r["match"]["confidence"] if r.get("match") else 0,
                "personName": r["match"]["personName"] if r.get("match") else "UNKNOWN",
            })
        else:
            _stats["rejected"] += 1
            logger.info("Frame rejected: %s", r.get("reason"))

    logger.debug(
        "Window: %.0fms, %d faces, %d identities resolved",
        window_ms, len(snapshot), len(results),
    )


async def _drain_loop():
    """Background task that replays buffered events every 10s when circuit is CLOSED."""
    logger.info("Drain loop started (interval=10s)")
    while True:
        try:
            await asyncio.sleep(10)
            if backend and backend.circuit_breaker.state == "CLOSED":
                drained = await backend.drain_local_buffer()
                if drained > 0:
                    logger.info("Drain loop: replayed %d buffered events", drained)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Drain loop error: %s", e, exc_info=True)


async def _capture_loop():
    global _last_process_time, _stats, _latest_frame_jpg, _motion_prev_gray
    logger.info("Background capture loop started (processing_fps=%d)", settings.processing_fps)
    last_detect_time = 0.0
    _frame_count = 0

    while True:
        try:
            cap = _state.get("capture")
            if cap is None:
                await asyncio.sleep(0.1)
                continue

            frame = await asyncio.to_thread(cap.read_frame)
            if frame is None:
                logger.warning("Failed to read frame")
                await asyncio.sleep(0.1)
                continue

            _stats["frames_captured"] += 1
            _frame_count += 1

            if "frame_size" not in _state:
                _state["frame_size"] = {"width": frame.shape[1], "height": frame.shape[0]}

            rx = ry = rw = rh = 0
            roi = _state.get("roi", _roi)
            roi_active = roi["width"] > 0 and roi["height"] > 0
            if roi_active:
                h, w = frame.shape[:2]
                rx = min(roi["x"], w - 1)
                ry = min(roi["y"], h - 1)
                rw = min(roi["width"], w - rx)
                rh = min(roi["height"], h - ry)
                cv2.rectangle(frame, (rx, ry), (rx + rw, ry + rh), (0, 255, 0), 2)

            if _state["stream_connections"] > 0:
                _, jpg_buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                _latest_frame_jpg = jpg_buffer.tobytes()
                _state["latest_frame_jpg"] = _latest_frame_jpg
                if _frame_count % 10 == 0:
                    logger.debug("Encoded frame %d for stream (%d conns)", _frame_count, _state["stream_connections"])
            else:
                if _frame_count % 30 == 0:
                    logger.debug("Skipping JPEG encode (0 stream connections)")
            await asyncio.sleep(0)

            if detector is None:
                continue

            now = time.time()
            detect_interval = 1.0 / max(1, _state.get("processing_fps", 3))
            if (now - last_detect_time) < detect_interval:
                continue
            last_detect_time = now

            # Downscale for detection while keeping full-res frame for streaming.
            # det_scale < 1.0 when active; inv_scale maps results back to full-frame space.
            # rx/ry are 0 when no ROI — the unified coord formula below handles all cases.
            max_w = settings.detect_max_width
            if max_w > 0 and frame.shape[1] > max_w:
                det_scale = max_w / frame.shape[1]
                det_h = int(frame.shape[0] * det_scale)
                detect_source = cv2.resize(frame, (max_w, det_h), interpolation=cv2.INTER_LINEAR)
            else:
                det_scale = 1.0
                detect_source = frame
            inv_scale = 1.0 / det_scale

            if roi_active:
                srx = int(rx * det_scale); sry = int(ry * det_scale)
                srw = max(1, int(rw * det_scale)); srh = max(1, int(rh * det_scale))
                detect_frame = detect_source[sry:sry+srh, srx:srx+srw]
            else:
                detect_frame = detect_source

            # Motion gate: skip expensive inference when the scene is static.
            # Hikvision hardware events take priority over the software pixel-diff gate
            # when the listener is configured.  Falls back to pixel-diff when it is not.
            _hikvision: HikvisionEventListener | None = _state.get("hikvision")
            if _hikvision is not None:
                # Hardware gate: strictly honor the TTL window — detection only runs while
                # the camera has recently fired a qualifying active event.
                # Skip the gate only while still connecting (don't lock out during reconnect).
                if not _hikvision.is_active() and _hikvision.is_connected():
                    _stats["motion_skipped"] += 1
                    continue
            elif settings.motion_threshold > 0 and not _active_tracks:
                # Software pixel-diff gate (fallback when no Hikvision listener)
                _gray = cv2.cvtColor(
                    cv2.resize(detect_frame, (160, 120), interpolation=cv2.INTER_NEAREST),
                    cv2.COLOR_BGR2GRAY,
                )
                if _motion_prev_gray is not None:
                    _diff = cv2.absdiff(_gray, _motion_prev_gray)
                    _ratio = float(np.count_nonzero(_diff > settings.motion_pixel_threshold)) / _diff.size
                    _motion_prev_gray = _gray
                    if _ratio < settings.motion_threshold:
                        _stats["motion_skipped"] += 1
                        continue
                else:
                    _motion_prev_gray = _gray

            faces = await asyncio.to_thread(detector.detect, detect_frame)
            if not faces:
                continue

            # Map detection coordinates back to full-frame space.
            # Applies inv_scale (undo downscale) and rx/ry offset (undo ROI crop) in one pass.
            for face in faces:
                b = face["bbox"]
                b[0] = b[0] * inv_scale + rx
                b[1] = b[1] * inv_scale + ry
                b[2] = b[2] * inv_scale + rx
                b[3] = b[3] * inv_scale + ry
                if face.get("landmarks"):
                    for lm in face["landmarks"]:
                        lm[0] = lm[0] * inv_scale + rx
                        lm[1] = lm[1] * inv_scale + ry

            _stats["faces_detected"] += len(faces)
            now_iso = datetime.now(timezone.utc).isoformat()

            for face in faces:
                tid = _match_or_create_track(face["bbox"], now)
                _window_manager.collect(tid, face, frame, face["confidence"], now_iso)

            if not _window_manager.is_window_open() and _window_manager.has_faces():
                snapshot = _window_manager.finalize()
                asyncio.create_task(_process_snapshot(snapshot, backend))

        except Exception as e:
            logger.error("Capture loop error: %s", e, exc_info=True)
            await asyncio.sleep(1.0)
            continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    global capture, detector, backend
    try:
        capture = CameraCapture()
        _state["capture"] = capture
        logger.info("Camera initialized")
    except Exception as e:
        logger.warning("Camera not available: %s", e)
    try:
        # DetectorPool.__init__ spawns a subprocess and loads InsightFace (~5–10s).
        # Running it in a thread keeps the event loop responsive during startup.
        detector = await asyncio.to_thread(DetectorPool)
        _state["detector"] = detector
        logger.info("Detector initialized")
    except Exception as e:
        logger.warning("Detector not available: %s", e)
    backend = NetBackendClient()
    _state["backend"] = backend
    key_hint = (settings.net_api_key[:6] + "...") if len(settings.net_api_key) > 6 else "(empty)"
    logger.info("Backend client initialized → %s  gate=%s  api_key=%s",
                settings.net_backend_url, settings.gate_id, key_hint)

    if settings.hikvision_url:
        hik = HikvisionEventListener(
            base_url=settings.hikvision_url,
            user=settings.hikvision_user,
            password=settings.hikvision_password,
            event_types=settings.hikvision_event_types,
            ttl_ms=settings.hikvision_event_ttl_ms,
            detection_target=settings.hikvision_detection_target,
        )
        _state["hikvision"] = hik
        logger.info(
            "Hikvision listener started → %s  types=%s  target=%s  ttl=%dms",
            settings.hikvision_url,
            settings.hikvision_event_types or "all",
            settings.hikvision_detection_target or "any",
            settings.hikvision_event_ttl_ms,
        )

    capture_task = asyncio.create_task(_capture_loop())
    drain_task = asyncio.create_task(_drain_loop())
    yield
    capture_task.cancel()
    drain_task.cancel()
    try:
        await capture_task
    except asyncio.CancelledError:
        pass
    try:
        await drain_task
    except asyncio.CancelledError:
        pass
    hik = _state.get("hikvision")
    if hik:
        hik.stop()
    if detector:
        detector.shutdown()
    cap = _state.get("capture")
    if cap:
        cap.release()
    if backend:
        await backend.close()


app = FastAPI(
    title="GateVision AI",
    lifespan=lifespan,
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ],
)

register_routes(app, _state)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("gate_vision_ai.main:app", host="0.0.0.0", port=8000)
