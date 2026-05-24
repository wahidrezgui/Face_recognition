import json
import logging
import os
import time
import asyncio
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import cv2
from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .capture import CameraCapture
from .detector import FaceDetector
from .client import NetBackendClient
from .window import InteractionWindowManager, IdentityScheduler
from .routes import register_routes

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("gate_vision_ai")

# Override camera_source from persisted config file if it exists
_config_path = settings.video_source_config_path
if os.path.isfile(_config_path):
    try:
        with open(_config_path) as f:
            _cfg = json.load(f)
        if "camera_source" in _cfg:
            settings.camera_source = str(_cfg["camera_source"])
            logger.info("Loaded camera_source from config: %s", settings.camera_source)
        if "direction" in _cfg:
            settings.direction = str(_cfg["direction"])
            logger.info("Loaded direction from config: %s", settings.direction)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read config file %s: %s", _config_path, e)

# Override processing_fps from persisted python settings if present
_python_settings_path = settings.python_settings_config_path
if os.path.isfile(_python_settings_path):
    try:
        with open(_python_settings_path) as f:
            _ps = json.load(f)
        if "processing_fps" in _ps:
            settings.processing_fps = int(_ps["processing_fps"])
            logger.info("Loaded processing_fps from config: %d", settings.processing_fps)
    except (json.JSONDecodeError, OSError, ValueError) as e:
        logger.warning("Failed to read python settings %s: %s", _python_settings_path, e)

capture: CameraCapture | None = None
detector: FaceDetector | None = None
backend: NetBackendClient | None = None

_last_process_time: float = 0
_events_log: deque = deque(maxlen=100)
_stats = {"frames_captured": 0, "faces_detected": 0, "events_sent": 0, "rejected": 0, "backend_errors": 0, "circuit_open": False, "windows_processed": 0}
_latest_frame_jpg: bytes | None = None

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


async def _capture_loop():
    global _last_process_time, _stats, _latest_frame_jpg
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

            detect_frame = frame[ry:ry+rh, rx:rx+rw] if roi_active else frame
            faces = detector.detect(detect_frame)
            if not faces:
                continue
            if roi_active:
                for face in faces:
                    face["bbox"][0] += rx
                    face["bbox"][1] += ry
                    face["bbox"][2] += rx
                    face["bbox"][3] += ry
                    if face.get("landmarks"):
                        for lm in face["landmarks"]:
                            lm[0] += rx
                            lm[1] += ry

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


async def _drain_loop():
    """Every 10s, drain buffered events to the central server when circuit is CLOSED."""
    while True:
        await asyncio.sleep(10)
        backend = _state.get("backend")
        if backend is None:
            continue
        if backend.circuit_breaker.state != "CLOSED":
            continue
        try:
            drained = await backend.drain_local_buffer()
            if drained > 0:
                _stats["events_sent"] += drained
        except Exception as e:
            logger.error("Drain loop error: %s", e)


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
        detector = FaceDetector()
        _state["detector"] = detector
        logger.info("Detector initialized")
    except Exception as e:
        logger.warning("Detector not available: %s", e)
    backend = NetBackendClient()
    _state["backend"] = backend
    logger.info("Backend client initialized")

    task = asyncio.create_task(_capture_loop())
    drain_task = asyncio.create_task(_drain_loop())
    yield
    task.cancel()
    drain_task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    try:
        await drain_task
    except asyncio.CancelledError:
        pass
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
