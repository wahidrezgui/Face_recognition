import asyncio
import logging
import os
import platform
import subprocess
import time
from collections import deque
from typing import Any

import cv2
import numpy as np
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel

from .config import settings
from .quality import check_quality, decode_base64_frame, crop_face_b64

_events_log: deque = deque(maxlen=100)

logger = logging.getLogger(__name__)


# ── Pydantic models ───────────────────────────────────────────────────────────

class ProcessingFpsRequest(BaseModel):
    fps: int


class RestartRequest(BaseModel):
    source: str
    gate_id: str = ""


class RecognizeRequest(BaseModel):
    frame_b64: str


class FaceMatch(BaseModel):
    person_id: str | None = None
    name: str | None = None
    score: float = 0.0
    bbox: list[float]
    quality_ok: bool = True
    quality_reason: str = ""


class RecognizeResponse(BaseModel):
    faces: list[FaceMatch]
    latency_ms: float


class EnrollRequest(BaseModel):
    person_id: str
    name: str
    frame_b64: str


class EnrollResponse(BaseModel):
    ok: bool
    embedding_count: int
    message: str = ""


class PersonInfo(BaseModel):
    person_id: str
    name: str
    embedding_count: int


class HealthResponse(BaseModel):
    status: str
    fps: float
    embedding_count: int
    model: str
    provider: str
    stats: dict


# ── Auth dependency ───────────────────────────────────────────────────────────

def _require_api_key(request: Request) -> None:
    key = settings.local_api_key
    if not key:
        return
    provided = request.headers.get("X-Api-Key", "")
    if provided != key:
        raise HTTPException(status_code=401, detail="invalid_api_key")


# ── MJPEG stream ──────────────────────────────────────────────────────────────

async def _mjpeg_generator(state: dict):
    state["stream_connections"] = state.get("stream_connections", 0) + 1
    try:
        boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
        while True:
            jpg: bytes | None = state.get("latest_annotated_jpg")
            if jpg is not None:
                yield boundary + jpg + b"\r\n"
            await asyncio.sleep(1 / 30)
    finally:
        state["stream_connections"] = max(0, state.get("stream_connections", 1) - 1)


# ── Route registration ────────────────────────────────────────────────────────

def register_routes(app: FastAPI, state: dict) -> None:

    @app.get("/api/v1/health", response_model=HealthResponse)
    async def health():
        det = state.get("detector")
        store = state.get("store")
        return HealthResponse(
            status="ok" if det is not None else "initializing",
            fps=round(state.get("stats", {}).get("fps", 0.0), 1),
            embedding_count=store.embedding_count() if store else 0,
            model=det.model_pack if det else settings.model_pack,
            provider=det.active_provider if det else "unknown",
            stats=state.get("stats", {}),
        )

    @app.get("/health", response_model=HealthResponse)
    async def health_alias():
        return await health()

    @app.post("/api/v1/recognize", response_model=RecognizeResponse)
    async def recognize(body: RecognizeRequest):
        det = state.get("detector")
        store = state.get("store")
        if det is None:
            raise HTTPException(status_code=503, detail="detector_not_ready")

        frame = decode_base64_frame(body.frame_b64)
        if frame is None:
            raise HTTPException(status_code=400, detail="invalid_frame")

        t0 = time.perf_counter()
        face_results = await det.detect(frame)
        matches: list[FaceMatch] = []

        for face in face_results:
            face_dict = {
                "bbox": face.bbox,
                "confidence": face.confidence,
                "landmarks": face.landmarks,
                "pose": face.pose,
            }
            ok, reason = check_quality(face_dict, frame)

            match = FaceMatch(bbox=face.bbox, quality_ok=ok, quality_reason=reason)

            if ok and face.embedding is not None and store is not None:
                result = store.search(face.embedding)
                if result is not None:
                    match.person_id = result.person_id
                    match.name = result.label
                    match.score = round(result.score, 4)

            matches.append(match)

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        state.get("stats", {})["last_latency_ms"] = latency_ms
        return RecognizeResponse(faces=matches, latency_ms=latency_ms)

    @app.post("/api/v1/enroll", response_model=EnrollResponse, dependencies=[Depends(_require_api_key)])
    async def enroll(body: EnrollRequest):
        det = state.get("detector")
        store = state.get("store")
        if det is None:
            raise HTTPException(status_code=503, detail="detector_not_ready")
        if store is None:
            raise HTTPException(status_code=503, detail="store_not_ready")

        frame = decode_base64_frame(body.frame_b64)
        if frame is None:
            raise HTTPException(status_code=400, detail="invalid_frame")

        face_results = await det.detect(frame)
        if not face_results:
            return EnrollResponse(ok=False, embedding_count=store.embedding_count(), message="no_face_detected")

        best = max(face_results, key=lambda f: f.confidence)
        face_dict = {
            "bbox": best.bbox,
            "confidence": best.confidence,
            "landmarks": best.landmarks,
            "pose": best.pose,
        }
        ok, reason = check_quality(face_dict, frame)
        if not ok:
            return EnrollResponse(ok=False, embedding_count=store.embedding_count(), message=f"quality_failed:{reason}")

        if best.embedding is None:
            return EnrollResponse(ok=False, embedding_count=store.embedding_count(), message="no_embedding")

        # Warn on near-duplicate enrollment
        dup = store.search(best.embedding, threshold=settings.enroll_dedup_threshold)
        if dup is not None and dup.person_id == body.person_id:
            logger.info("Enroll: near-duplicate embedding for %s (score=%.3f) — enrolling anyway", body.person_id, dup.score)

        store.add(body.person_id, body.name, best.embedding)
        return EnrollResponse(ok=True, embedding_count=store.embedding_count())

    @app.delete("/api/v1/persons/{person_id}", dependencies=[Depends(_require_api_key)])
    async def delete_person(person_id: str):
        store = state.get("store")
        if store is None:
            raise HTTPException(status_code=503, detail="store_not_ready")
        removed = store.remove(person_id)
        if removed == 0:
            raise HTTPException(status_code=404, detail="person_not_found")
        return {"ok": True, "removed": removed}

    @app.get("/api/v1/persons", response_model=list[PersonInfo])
    async def list_persons():
        store = state.get("store")
        if store is None:
            return []
        return [PersonInfo(**p) for p in store.persons()]

    @app.get("/api/v1/stream")
    async def stream():
        return StreamingResponse(
            _mjpeg_generator(state),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )

    @app.get("/api/v1/stats")
    async def stats():
        return state.get("stats", {})

    @app.get("/stream")
    async def stream_compat():
        """Compatibility alias — v0 exposed the MJPEG stream at /stream."""
        return StreamingResponse(
            _mjpeg_generator(state),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )

    # ── Processing FPS ───────────────────────────────────────────────────────

    @app.get("/config/processing-fps")
    def get_processing_fps():
        return {"fps": state.get("processing_fps", settings.processing_fps)}

    @app.post("/config/processing-fps", dependencies=[Depends(_require_api_key)])
    def set_processing_fps(req: ProcessingFpsRequest):
        if req.fps < 1 or req.fps > 30:
            raise HTTPException(400, "fps must be between 1 and 30")
        state["processing_fps"] = req.fps
        settings.processing_fps = req.fps
        logger.info("Processing FPS set to %d", req.fps)
        return {"fps": req.fps}

    # ── Camera enumeration ───────────────────────────────────────────────────

    @app.get("/cameras")
    def list_cameras():
        available = []
        dshow = getattr(cv2, "CAP_DSHOW", 700)
        for i in range(10):
            try:
                cap = cv2.VideoCapture(i, dshow)
                ok = cap.isOpened()
                cap.release()
                if ok:
                    available.append(i)
            except Exception:
                pass

        friendly: dict[int, str] = {}
        if platform.system() == "Windows":
            try:
                script = (
                    'Get-CimInstance -Namespace root/cimv2 -ClassName Win32_PnPEntity '
                    '| Where-Object {$_.PNPClass -eq "Camera" -or $_.PNPClass -eq "Image"} '
                    '| Select-Object FriendlyName | ConvertTo-Json -Compress'
                )
                r = subprocess.run(
                    ["powershell", "-NoProfile", "-Command", script],
                    capture_output=True, text=True, timeout=5,
                )
                if r.returncode == 0 and r.stdout.strip():
                    import json
                    names = json.loads(r.stdout)
                    if isinstance(names, dict):
                        names = [names]
                    for idx, dev in enumerate(names):
                        if idx < len(available) and dev.get("FriendlyName"):
                            friendly[available[idx]] = dev["FriendlyName"]
            except Exception:
                pass

        return [{"index": idx, "name": friendly.get(idx, f"Camera {idx}")} for idx in available]

    # ── Camera events (Hikvision stub — v1 has no Hikvision listener) ────────

    @app.get("/camera-events")
    def get_camera_events(limit: int = 30):
        return {
            "enabled": False,
            "connected": False,
            "events": [],
            "note": "Hikvision listener not present in v1",
        }

    # ── Recent recognition events ─────────────────────────────────────────────

    @app.get("/events/recent")
    def recent_events(limit: int = 20):
        return list(reversed(list(_events_log)[-limit:]))

    # ── Restart (hot-swap camera source) ─────────────────────────────────────

    @app.post("/restart", dependencies=[Depends(_require_api_key)])
    async def restart(req: RestartRequest):
        from .capture import CameraCapture
        source = req.source.strip()
        if not source:
            raise HTTPException(400, "source is required")

        # Same source and camera already open → nothing to do
        existing = state.get("capture")
        if existing is not None and str(settings.camera_url) == source:
            try:
                if existing.cap.isOpened():
                    logger.info("Restart no-op: already on source=%s and camera is open", source)
                    return {"status": "ok", "source": source}
            except Exception:
                pass

        # Release the existing capture BEFORE opening a new one.
        # On Windows, DirectShow won't let two handles own the same camera device,
        # so we must free it first or the new open will time out (→ 502).
        state["capture"] = None
        if existing is not None:
            await asyncio.to_thread(existing.release)

        logger.info("Restarting capture with source=%s", source)
        try:
            new_cap = await asyncio.to_thread(CameraCapture, source)
            test_frame = await asyncio.to_thread(new_cap.read_frame)
            if test_frame is None:
                await asyncio.to_thread(new_cap.release)
                raise HTTPException(502, f"Camera opened but first frame read timed out: {source}")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, f"Cannot open camera source '{source}': {exc}") from exc

        state["capture"] = new_cap
        settings.camera_url = source
        logger.info("Capture hot-swapped to source=%s", source)
        return {"status": "ok", "source": source}

    # ── Stop ──────────────────────────────────────────────────────────────────

    @app.post("/stop", dependencies=[Depends(_require_api_key)])
    async def stop():
        import signal
        logger.info("Shutdown requested via /stop")
        loop = asyncio.get_event_loop()
        loop.call_later(0.5, lambda: os.kill(os.getpid(), signal.SIGINT))
        return {"status": "stopping"}

    # ── Prometheus metrics ────────────────────────────────────────────────────

    @app.get("/metrics")
    def metrics():
        stats = state.get("stats", {})
        lines = [
            "# HELP gatevision_frames_captured_total Total frames captured",
            "# TYPE gatevision_frames_captured_total counter",
            f'gatevision_frames_captured_total {stats.get("frames_captured", 0)}',
            "# HELP gatevision_faces_detected_total Total faces detected",
            "# TYPE gatevision_faces_detected_total counter",
            f'gatevision_faces_detected_total {stats.get("faces_detected", 0)}',
            "# HELP gatevision_events_sent_total Identity recognitions",
            "# TYPE gatevision_events_sent_total counter",
            f'gatevision_events_sent_total {stats.get("events_sent", 0)}',
        ]
        return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; charset=utf-8")

    @app.get("/stream/status")
    def stream_status():
        """Compatibility endpoint polled by the .NET backend to determine gate online status."""
        try:
            cap = state.get("capture")
            det = state.get("detector")
            store = state.get("store")
            try:
                camera_open = cap is not None and cap.cap.isOpened()
            except Exception:
                camera_open = False
            return {
                "camera_open": camera_open,
                "detector_loaded": det is not None,
                "active_model": det.model_pack if det else None,
                "active_det_size": list(det.det_size) if det else None,
                "active_provider": det.active_provider if det else None,
                "embedding_count": store.embedding_count() if store else 0,
                "motion_gate": {
                    "enabled": settings.motion_threshold > 0,
                    "threshold": settings.motion_threshold,
                    "pixel_threshold": settings.motion_pixel_threshold,
                    "skipped_total": state.get("stats", {}).get("motion_skipped", 0),
                },
                "camera_source": settings.camera_url,   # key the dashboard reads

                "processing_fps": state.get("processing_fps", settings.processing_fps),
                "stats": state.get("stats", {}),
            }
        except Exception as e:
            logger.error("stream_status: %s", e, exc_info=True)
            return {"camera_open": False, "detector_loaded": False, "error": str(e)}
