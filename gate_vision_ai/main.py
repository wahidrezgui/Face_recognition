import logging
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

capture: CameraCapture | None = None
detector: FaceDetector | None = None
backend: NetBackendClient | None = None

_last_process_time: float = 0
_events_log: deque = deque(maxlen=100)
_stats = {"frames_captured": 0, "faces_detected": 0, "events_sent": 0, "rejected": 0, "backend_errors": 0, "circuit_open": False}
_latest_frame_jpg: bytes | None = None

_roi: dict = {"x": settings.roi_x, "y": settings.roi_y, "width": settings.roi_width, "height": settings.roi_height}

# Mutable container for route closures (captured by reference at import time)
_state = {
    "capture": None,
    "detector": None,
    "backend": None,
    "stats": _stats,
    "events_log": _events_log,
    "latest_frame_jpg": _latest_frame_jpg,
    "roi": _roi,
}


async def _capture_loop():
    global _last_process_time, _stats, _latest_frame_jpg
    logger.info("Background capture loop started (interval=%dms)", settings.capture_interval_ms)
    last_detect_time = 0.0
    detect_interval = settings.capture_interval_ms / 1000.0

    while True:
        if capture is None:
            await asyncio.sleep(0.1)
            continue

        frame = await asyncio.to_thread(capture.read_frame)
        if frame is None:
            logger.warning("Failed to read frame")
            await asyncio.sleep(0.1)
            continue

        _stats["frames_captured"] += 1
        _, jpg_buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        _latest_frame_jpg = jpg_buffer.tobytes()
        _state["latest_frame_jpg"] = _latest_frame_jpg
        await asyncio.sleep(0)

        if detector is None:
            continue

        now = time.time()
        if (now - last_detect_time) < detect_interval:
            continue
        last_detect_time = now

        faces = detector.detect(frame)
        if not faces:
            continue

        _stats["faces_detected"] += 1
        now_iso = datetime.now(timezone.utc).isoformat()

        best_face = max(faces, key=lambda f: f["confidence"])
        r = await process_single_face(best_face, frame, now_iso, "entry", backend)
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
    if capture:
        capture.release()
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
