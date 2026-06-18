import logging
import time
import asyncio
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment as _hungarian
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
from .config_loader import load_gate_config_from_api

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("gate_vision_ai")

# Fetch gate processing config from the .NET API at startup.
# Env vars (GV_*) always take priority — the API fills in everything else.
load_gate_config_from_api()

capture: CameraCapture | None = None
detector: DetectorPool | None = None
backend: NetBackendClient | None = None

_last_process_time: float = 0
_events_log: deque = deque(maxlen=100)
_stats = {"frames_captured": 0, "faces_detected": 0, "events_sent": 0, "rejected": 0, "backend_errors": 0, "circuit_open": False, "windows_processed": 0, "motion_skipped": 0}
_latest_frame_jpg: bytes | None = None
_motion_prev_gray: np.ndarray | None = None  # previous downscaled gray frame for motion gate

_roi: dict = {"x": settings.roi_x, "y": settings.roi_y, "width": settings.roi_width, "height": settings.roi_height}

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


class _KalmanTrack:
    """Constant-velocity Kalman filter for a single face track.
    State vector: [cx, cy, w, h, vx, vy, vw, vh]
    """

    def __init__(self, bbox: list[float], track_id: int) -> None:
        self.id = track_id
        self.hits = 0
        self.last_seen: float = 0.0
        self.confirmed = False
        cx, cy, w, h = self._to_cwh(bbox)
        self._x = np.array([cx, cy, w, h, 0.0, 0.0, 0.0, 0.0])
        self._F = np.eye(8); self._F[0, 4] = self._F[1, 5] = self._F[2, 6] = self._F[3, 7] = 1.0
        self._H = np.zeros((4, 8)); self._H[0, 0] = self._H[1, 1] = self._H[2, 2] = self._H[3, 3] = 1.0
        self._Q = np.diag([1.0, 1.0, 1.0, 1.0, 0.01, 0.01, 0.01, 0.01])
        self._R = np.diag([1.0, 1.0, 10.0, 10.0])
        self._P = np.diag([10.0, 10.0, 10.0, 10.0, 100.0, 100.0, 100.0, 100.0])

    @staticmethod
    def _to_cwh(bbox: list[float]) -> tuple:
        x1, y1, x2, y2 = bbox
        return (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1

    @staticmethod
    def _to_bbox(cx: float, cy: float, w: float, h: float) -> list[float]:
        return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]

    def predict(self) -> list[float]:
        self._x = self._F @ self._x
        self._P = self._F @ self._P @ self._F.T + self._Q
        return self._to_bbox(*self._x[:4])

    def update(self, bbox: list[float], now: float) -> None:
        z = np.array(self._to_cwh(bbox))
        innov = z - self._H @ self._x
        S = self._H @ self._P @ self._H.T + self._R
        K = self._P @ self._H.T @ np.linalg.inv(S)
        self._x += K @ innov
        self._P = (np.eye(8) - K @ self._H) @ self._P
        self.hits += 1
        self.last_seen = now
        if self.hits >= 1:
            self.confirmed = True


class _SORTTracker:
    """SORT: Kalman prediction + Hungarian assignment for multi-face tracking."""

    _IOU_THRESHOLD: float = 0.30
    _MAX_LOST_S: float = 3.0

    def __init__(self) -> None:
        self._tracks: list[_KalmanTrack] = []
        self._next_id: int = 0

    def has_active_tracks(self) -> bool:
        return any(t.confirmed for t in self._tracks)

    def update(self, detections: list[list[float]], now: float) -> list[tuple[int, bool]]:
        """Return (track_id, is_confirmed) for each input detection, preserving order."""
        self._tracks = [t for t in self._tracks if now - t.last_seen <= self._MAX_LOST_S]
        n_t, n_d = len(self._tracks), len(detections)
        det_results: dict[int, tuple[int, bool]] = {}

        if n_t == 0:
            for di, bbox in enumerate(detections):
                t = self._spawn(bbox, now)
                det_results[di] = (t.id, t.confirmed)
            return [det_results[di] for di in range(n_d)]

        preds = [t.predict() for t in self._tracks]
        iou_mat = np.array([[_bbox_iou(preds[ti], detections[di]) for di in range(n_d)] for ti in range(n_t)])
        row_ind, col_ind = _hungarian(1.0 - iou_mat)

        matched_d: set[int] = set()
        for ti, di in zip(row_ind, col_ind):
            if iou_mat[ti, di] >= self._IOU_THRESHOLD:
                self._tracks[ti].update(detections[di], now)
                matched_d.add(di)
                det_results[di] = (self._tracks[ti].id, self._tracks[ti].confirmed)

        for di, bbox in enumerate(detections):
            if di not in matched_d:
                t = self._spawn(bbox, now)
                det_results[di] = (t.id, t.confirmed)

        return [det_results[di] for di in range(n_d)]

    def _spawn(self, bbox: list[float], now: float) -> _KalmanTrack:
        self._next_id += 1
        t = _KalmanTrack(bbox, self._next_id)
        t.update(bbox, now)
        self._tracks.append(t)
        logger.debug("New track %d (total: %d)", t.id, len(self._tracks))
        return t


_window_manager = InteractionWindowManager(settings.window_duration_ms)
_scheduler = IdentityScheduler(settings.max_identity_requests_per_window, settings.greeting_delay_ms)
_snapshot_semaphore = asyncio.Semaphore(5)  # cap concurrent in-flight snapshot tasks
_tracker = _SORTTracker()

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
    async with _snapshot_semaphore:
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


async def _window_watcher():
    """Closes expired interaction windows independently of detection FPS.

    _capture_loop() closes windows only when a new frame arrives, so at low FPS
    a window can stay open far past its expiry. This coroutine sleeps for exactly
    window_duration_ms and closes any overdue window, bounding close-latency to
    roughly one window duration regardless of the detection rate.
    """
    logger.info("Window watcher started (window_duration=%.0fms)", settings.window_duration_ms)
    while True:
        try:
            await asyncio.sleep(settings.window_duration_ms / 1000)
            if not _window_manager.is_window_open() and _window_manager.has_faces():
                snapshot = _window_manager.finalize()
                asyncio.create_task(_process_snapshot(snapshot, backend))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Window watcher error: %s", e, exc_info=True)


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
            elif settings.motion_threshold > 0 and not _tracker.has_active_tracks():
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

            track_results = _tracker.update([f["bbox"] for f in faces], now)
            for (tid, confirmed), face in zip(track_results, faces):
                if confirmed:
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
        capture = CameraCapture(settings.camera_source)
        _state["capture"] = capture
        logger.info("Camera initialized (source=%s)", settings.camera_source)
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
    watcher_task = asyncio.create_task(_window_watcher())
    yield
    capture_task.cancel()
    drain_task.cancel()
    watcher_task.cancel()
    try:
        await capture_task
    except asyncio.CancelledError:
        pass
    try:
        await drain_task
    except asyncio.CancelledError:
        pass
    try:
        await watcher_task
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
