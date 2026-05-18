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
from .processing import process_single_face
from .routes import register_routes

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
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
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read config file %s: %s", _config_path, e)

capture: CameraCapture | None = None
detector: FaceDetector | None = None
backend: NetBackendClient | None = None

_last_process_time: float = 0
_events_log: deque = deque(maxlen=100)
_stats = {"frames_captured": 0, "faces_detected": 0, "events_sent": 0, "rejected": 0, "backend_errors": 0, "circuit_open": False}
_latest_frame_jpg: bytes | None = None

_roi: dict = {"x": settings.roi_x, "y": settings.roi_y, "width": settings.roi_width, "height": settings.roi_height}

# Simple bbox-based face tracker for track_id assignment
_track_last_bbox: list[float] | None = None
_track_counter: int = 0
_track_best_conf: dict[int, float] = {}


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


def _next_track_id(bbox: list[float]) -> int:
    global _track_last_bbox, _track_counter
    if _track_last_bbox is None or _bbox_iou(bbox, _track_last_bbox) < 0.3:
        _track_counter += 1
    _track_last_bbox = bbox
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
}


async def _capture_loop():
    global _last_process_time, _stats, _latest_frame_jpg, _track_best_conf
    logger.info("Background capture loop started (interval=%dms)", settings.capture_interval_ms)
    last_detect_time = 0.0
    detect_interval = settings.capture_interval_ms / 1000.0
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

            _stats["faces_detected"] += 1
            now_iso = datetime.now(timezone.utc).isoformat()

            best_face = max(faces, key=lambda f: f["confidence"])
            tid = _next_track_id(best_face["bbox"])
            if best_face["confidence"] <= _track_best_conf.get(tid, 0):
                continue
            _track_best_conf[tid] = best_face["confidence"]
            if tid % 50 == 0:
                _track_best_conf = {k: v for k, v in _track_best_conf.items() if k >= tid - 10}
            r = await process_single_face(best_face, frame, now_iso, "entry", backend, track_id=tid)
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
                    "timestamp": now_iso,
                    "confidence": r["match"]["confidence"] if r.get("match") else 0,
                    "personName": r["match"]["personName"] if r.get("match") else "UNKNOWN",
                })
            else:
                _stats["rejected"] += 1
                logger.info("Frame rejected: %s", r.get("reason"))

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
        detector = FaceDetector()
        _state["detector"] = detector
        logger.info("Detector initialized")
    except Exception as e:
        logger.warning("Detector not available: %s", e)
    backend = NetBackendClient()
    _state["backend"] = backend
    logger.info("Backend client initialized")

    task = asyncio.create_task(_capture_loop())
    yield
    task.cancel()
    try:
        await task
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
