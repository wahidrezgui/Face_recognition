import asyncio
import logging
import time
from collections import deque
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .config_loader import load_gate_config_from_api
from .capture import CameraCapture
from .detector import FaceDetector
from .recognizer import EmbeddingStore
from .qdrant_loader import load_embeddings_from_qdrant
from .tracker import SORTTracker
from .quality import check_quality
from .backend_client import NetBackendClient
from .routes import register_routes
from .time_utils import utc_now_iso_ms

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("gate_vision_ai_v1")
logging.getLogger("httpx").setLevel(logging.WARNING)  # silence per-batch scroll noise

# Pull per-gate settings from the .NET API before anything else starts.
# GV1_* env vars always take priority over whatever the DB returns.
load_gate_config_from_api()

# ── FPS tracker ───────────────────────────────────────────────────────────────

_fps_times: deque = deque(maxlen=30)


def _update_fps() -> float:
    _fps_times.append(time.monotonic())
    if len(_fps_times) >= 2:
        return (len(_fps_times) - 1) / (_fps_times[-1] - _fps_times[0])
    return 0.0


# ── Shared state ──────────────────────────────────────────────────────────────

_stats: dict = {
    "frames_captured": 0,
    "faces_detected": 0,
    "quality_pass": 0,
    "quality_fail": 0,
    "recognition_tried": 0,
    "below_threshold": 0,
    "recognitions": 0,
    "events_sent": 0,       # incremented once per track when event fires to backend
    "backend_errors": 0,
    "circuit_open": False,
    "windows_processed": 0,
    "motion_skipped": 0,
    "fps": 0.0,
    "last_latency_ms": 0.0,
}

_state: dict = {
    "capture": None,
    "detector": None,
    "store": None,
    "backend": None,
    "stats": _stats,
    "latest_annotated_jpg": None,
    "stream_connections": 0,
    "processing_fps": settings.processing_fps,
}

# Re-fire identify when recognition score improves by this delta (overridden by DB gate config).
# _notified_tracks stores (person_id, best_recognition_score) per track.

# ── Capture loop ──────────────────────────────────────────────────────────────

_tracker = SORTTracker()
_motion_prev_gray: np.ndarray | None = None


def _encode_jpg(frame: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return buf.tobytes() if ok else b""


async def _capture_loop() -> None:
    global _motion_prev_gray

    last_detect_time = 0.0
    _detect_frame_count = 0        # detection-eligible frames (after throttle)
    _log_interval = 50             # log a summary every N detection-eligible frames
    _first_face_logged = False
    _first_frame_logged = False
    _quality_fail_logged = 0       # log first few quality failure reasons at INFO
    _notified_tracks: dict[int, tuple[str, float]] = {}   # track_id → (person_id, best_conf_sent)
    _unknown_notified_tracks: dict[int, bool] = {}  # track_id → True; fire once for unknowns
    _below_identify_notified: dict[int, bool] = {}  # track_id → logged below identify_min_score

    logger.info("Capture loop started — waiting for first frame...")

    while True:
        try:
            cap: CameraCapture | None = _state.get("capture")
            if cap is None:
                await asyncio.sleep(0.1)
                continue

            frame = await asyncio.to_thread(cap.read_frame)
            if frame is None:
                await asyncio.sleep(0.05)
                continue

            _stats["frames_captured"] += 1

            if not _first_frame_logged:
                logger.info(
                    "First frame received — shape=%s  camera=%s",
                    frame.shape, settings.camera_url,
                )
                _first_frame_logged = True

            # ── Throttle to processing_fps ────────────────────────────────────
            now = time.monotonic()
            detect_interval = 1.0 / max(1, _state["processing_fps"])
            if (now - last_detect_time) < detect_interval:
                if _state["stream_connections"] > 0:
                    _state["latest_annotated_jpg"] = await asyncio.to_thread(_encode_jpg, frame)
                await asyncio.sleep(0)
                continue

            last_detect_time = now
            _detect_frame_count += 1

            # ── Motion gate ───────────────────────────────────────────────────
            # Skip if no pixel change AND no active tracks.
            # Still update stream so the viewer sees live video even when nothing moves.
            if settings.motion_threshold > 0 and not _tracker.has_active_tracks():
                gray = cv2.cvtColor(
                    cv2.resize(frame, (160, 120), interpolation=cv2.INTER_AREA),
                    cv2.COLOR_BGR2GRAY,
                )
                if _motion_prev_gray is not None:
                    diff = cv2.absdiff(gray, _motion_prev_gray)
                    ratio = float(
                        np.count_nonzero(diff > settings.motion_pixel_threshold)
                    ) / diff.size
                    _motion_prev_gray = gray
                    if ratio < settings.motion_threshold:
                        _stats["motion_skipped"] += 1
                        # Still push a plain frame so the MJPEG stream stays live
                        if _state["stream_connections"] > 0:
                            _state["latest_annotated_jpg"] = await asyncio.to_thread(_encode_jpg, frame)
                        await asyncio.sleep(0)
                        continue
                else:
                    _motion_prev_gray = gray

            # ── Periodic diagnostics ──────────────────────────────────────────
            if _detect_frame_count % _log_interval == 0:
                store_count = _state["store"].embedding_count() if _state.get("store") else -1
                logger.info(
                    "LOOP stats: detect_frames=%d  fps=%.1f  faces=%d  "
                    "q_pass=%d  q_fail=%d  recog_tried=%d  below_thr=%d  recog=%d  "
                    "events=%d  motion_skip=%d  embeddings=%d  streams=%d",
                    _detect_frame_count,
                    _stats["fps"],
                    _stats["faces_detected"],
                    _stats["quality_pass"],
                    _stats["quality_fail"],
                    _stats["recognition_tried"],
                    _stats["below_threshold"],
                    _stats["recognitions"],
                    _stats["events_sent"],
                    _stats["motion_skipped"],
                    store_count,
                    _state["stream_connections"],
                )

            # ── Detect faces (async, non-blocking to event loop) ──────────────
            det: FaceDetector | None = _state.get("detector")
            if det is None:
                logger.warning("LOOP: detector is None — model may still be loading")
                await asyncio.sleep(0.5)
                continue

            t0 = time.monotonic()
            face_results = await det.detect(frame)
            detect_ms = (time.monotonic() - t0) * 1000

            _stats["faces_detected"] += len(face_results)

            if face_results and not _first_face_logged:
                logger.info(
                    "First face detected! count=%d  detect_ms=%.1f  "
                    "embeddings_in_store=%d",
                    len(face_results),
                    detect_ms,
                    _state["store"].embedding_count() if _state.get("store") else 0,
                )
                _first_face_logged = True
            elif face_results:
                logger.debug(
                    "Faces detected: %d  detect_ms=%.1f",
                    len(face_results), detect_ms,
                )

            # ── Track ─────────────────────────────────────────────────────────
            track_assignments = _tracker.update(
                [f.bbox for f in face_results], now
            )

            # ── Recognise + annotate ──────────────────────────────────────────
            annotated = frame.copy()
            store: EmbeddingStore | None = _state.get("store")

            for (track_id, confirmed), face in zip(track_assignments, face_results):
                face_dict = {
                    "bbox": face.bbox,
                    "confidence": face.confidence,
                    "landmarks": face.landmarks,
                    "pose": face.pose,
                }
                ok, reason = check_quality(face_dict, frame)

                x1, y1, x2, y2 = [int(v) for v in face.bbox]
                label_text = f"t{track_id}"
                box_color = (0, 165, 255)  # orange = unconfirmed

                if not ok:
                    _stats["quality_fail"] += 1
                    label_text = f"low_q:{reason[:12]}"
                    box_color = (100, 100, 100)
                    if _quality_fail_logged < 5:
                        logger.info(
                            "Quality fail (track=%d confirmed=%s): %s",
                            track_id, confirmed, reason,
                        )
                        _quality_fail_logged += 1
                elif confirmed and face.embedding is not None and store is not None:
                    _stats["quality_pass"] += 1
                    _stats["recognition_tried"] += 1
                    result = store.search(face.embedding)
                    if result is not None:
                        _stats["recognitions"] += 1
                        label_text = f"{result.label} {result.score:.2f}"
                        box_color = (0, 220, 0)  # green = known
                        logger.info(
                            "Recognised: %s  score=%.3f  track=%d",
                            result.label, result.score, track_id,
                        )
                        _stored = _notified_tracks.get(track_id)
                        _score = float(result.score)
                        _meets_threshold = _score >= settings.identify_min_score
                        _is_first = _stored is None and _meets_threshold
                        _is_upgrade = (
                            _stored is not None
                            and result.person_id == _stored[0]
                            and _meets_threshold
                            and _score > _stored[1] + settings.refire_score_delta
                        )
                        if _is_first or _is_upgrade:
                            _notified_tracks[track_id] = (result.person_id, _score)
                            captured_at = utc_now_iso_ms()
                            backend: NetBackendClient | None = _state.get("backend")
                            if backend and settings.net_backend_url:
                                _stats["events_sent"] += 1
                                asyncio.create_task(
                                    backend.identify(
                                        embedding=face.embedding,
                                        quality=float(face.confidence),
                                        track_id=track_id,
                                        captured_at=captured_at,
                                        frame=frame,
                                        face_bbox=face.bbox,
                                        age=face.age,
                                        gender=face.gender,
                                    )
                                )
                            elif _is_first:
                                logger.warning(
                                    "Recognised %s score=%.3f but GV1_NET_BACKEND_URL not set — no event sent  track=%d",
                                    result.label, _score, track_id,
                                )
                            if len(_notified_tracks) > 1000:
                                keep = sorted(_notified_tracks.keys())[-500:]
                                _notified_tracks = {k: _notified_tracks[k] for k in keep}
                        elif _stored is None and not _meets_threshold:
                            if track_id not in _below_identify_notified:
                                _below_identify_notified[track_id] = True
                                logger.info(
                                    "Recognised %s score=%.3f — below identify_min_score=%.3f, not posting to backend  track=%d",
                                    result.label, _score, settings.identify_min_score, track_id,
                                )
                    else:
                        _stats["below_threshold"] += 1
                        label_text = "UNKNOWN"
                        box_color = (0, 0, 220)  # red = unknown
                        # Log best-match score the first 5 times so we can tune the threshold
                        if _stats["below_threshold"] <= 5:
                            best = store.search(face.embedding, threshold=0.0)
                            if best:
                                logger.info(
                                    "Below threshold: best_match=%s  score=%.4f  "
                                    "threshold=%.2f  gap=%.4f",
                                    best.label, best.score,
                                    settings.recognition_threshold,
                                    settings.recognition_threshold - best.score,
                                )
                        if settings.log_unknown and track_id not in _unknown_notified_tracks:
                            _unknown_notified_tracks[track_id] = True
                            _stats["events_sent"] += 1
                            captured_at = utc_now_iso_ms()
                            backend: NetBackendClient | None = _state.get("backend")
                            if backend:
                                asyncio.create_task(
                                    backend.identify(
                                        embedding=face.embedding,
                                        quality=float(face.confidence),
                                        track_id=track_id,
                                        captured_at=captured_at,
                                        frame=frame,
                                        face_bbox=face.bbox,
                                        age=face.age,
                                        gender=face.gender,
                                    )
                                )
                            if len(_unknown_notified_tracks) > 1000:
                                keep = sorted(_unknown_notified_tracks.keys())[-500:]
                                _unknown_notified_tracks = {k: _unknown_notified_tracks[k] for k in keep}
                else:
                    _stats["quality_pass"] += 1  # quality ok, but track not confirmed yet

                cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2)
                cv2.putText(
                    annotated, label_text, (x1, max(y1 - 6, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 1,
                )

            _stats["fps"] = round(_update_fps(), 1)
            _stats["last_latency_ms"] = round(detect_ms, 1)

            if _state["stream_connections"] > 0:
                _state["latest_annotated_jpg"] = await asyncio.to_thread(_encode_jpg, annotated)

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("Capture loop error: %s", exc, exc_info=True)
            await asyncio.sleep(1.0)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("gate_vision_ai_v1 STARTUP")
    logger.info("  camera:    %s", settings.camera_url)
    logger.info("  model:     %s", settings.model_pack)
    logger.info("  fps:       %d", settings.processing_fps)
    logger.info("  threshold: %.2f", settings.recognition_threshold)
    logger.info("  qdrant:    %s / %s", settings.qdrant_url, settings.qdrant_collection)
    logger.info("  backend:   %s", settings.net_backend_url or "(not set)")
    logger.info("=" * 60)

    # 1. Camera
    try:
        cap = CameraCapture(settings.camera_url)
        _state["capture"] = cap
        logger.info("[1/4] Camera opened — source=%s", settings.camera_url)
    except Exception as exc:
        logger.warning("[1/4] Camera unavailable (%s) — stream endpoints will return empty", exc)

    # 2. Detector — model load takes 5-10 s; run in thread to not block event loop
    try:
        det = await asyncio.to_thread(FaceDetector)
        _state["detector"] = det
        logger.info(
            "[2/4] Detector ready — model=%s  provider=%s",
            det.model_pack, det.active_provider,
        )
    except Exception as exc:
        logger.error("[2/4] Detector init failed: %s", exc, exc_info=True)

    # 3. Embedding store — populated entirely from Qdrant (source of truth, no disk cache)
    store = EmbeddingStore()
    _state["store"] = store

    try:
        qdrant_count = await load_embeddings_from_qdrant(store)
        if qdrant_count > 0:
            logger.info(
                "[3/4] EmbeddingStore: %d embeddings loaded from Qdrant",
                qdrant_count,
            )
        else:
            logger.warning(
                "[3/4] EmbeddingStore: EMPTY — Qdrant returned 0 embeddings.  "
                "Faces will be detected but all will show UNKNOWN until someone is enrolled."
            )
    except Exception as exc:
        logger.error("[3/4] Qdrant load failed: %s — store is empty", exc)

    # 4. Backend client + start pipeline
    backend = NetBackendClient()
    _state["backend"] = backend
    if settings.net_backend_url:
        logger.info("[4/5] Backend client ready — url=%s  gate=%s", settings.net_backend_url, settings.gate_id)
    else:
        logger.info("[4/5] Backend client: net_backend_url not set — events disabled (standalone mode)")

    logger.info("[5/5] Starting capture loop — embeddings=%d", store.embedding_count())
    capture_task = asyncio.create_task(_capture_loop(), name="capture_loop")

    yield

    # Shutdown
    logger.info("gate_vision_ai_v1 shutting down...")
    capture_task.cancel()
    try:
        await capture_task
    except asyncio.CancelledError:
        pass
    await backend.close()
    if _state.get("detector"):
        _state["detector"].shutdown()
    if _state.get("capture"):
        _state["capture"].release()
    logger.info("gate_vision_ai_v1 shutdown complete")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GateVision AI v1",
    description="Ultra-rapid local face recognition — no backend dependency",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app, _state)
