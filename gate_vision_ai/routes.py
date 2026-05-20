import json
import logging
import os
import platform
import subprocess
import asyncio
from datetime import datetime, timezone

import numpy as np
import cv2
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import settings
from .capture import CameraCapture
from .processing import process_single_face
from .quality import check_quality, crop_face_b64, estimate_pose_from_kps, decode_base64_frame, classify_pose
from .embedder import extract_embedding, average_embeddings

logger = logging.getLogger("gate_vision_ai")


class IdentifyRequest(BaseModel):
    embedding: list[float]
    frame_quality: float
    captured_at: str
    direction: str = "entry"


class EnrollRequest(BaseModel):
    personId: str
    frames: list[list[list[int]]]


class EnrollCaptureRequest(BaseModel):
    personId: str


class EnrollWebcamRequest(BaseModel):
    personId: str
    frames: list[str]
    replace: bool = False


class EnrollFromImageRequest(BaseModel):
    personId: str
    frame: str  # base64 jpeg — a single face crop from a gate event


class PoseRequest(BaseModel):
    frame: str


class RoiRequest(BaseModel):
    x: int
    y: int
    width: int
    height: int


class RestartRequest(BaseModel):
    source: str
    direction: str = "entry"


def register_routes(app, state: dict):
    s = state  # shorthand

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "camera": s["capture"] is not None,
            "detector": s["detector"] is not None,
            "stats": s["stats"],
        }

    @app.post("/identify")
    async def identify(req: IdentifyRequest):
        det = s["detector"]
        if det is None:
            raise HTTPException(503, "detector not available")
        dummy_face = {
            "bbox": [0, 0, 100, 100],
            "confidence": req.frame_quality,
            "landmarks": None,
            "embedding": np.array(req.embedding, dtype=np.float32),
        }
        return await process_single_face(dummy_face, np.zeros((1, 1, 3), dtype=np.uint8), req.captured_at, req.direction, s["backend"])

    @app.post("/enroll")
    async def enroll(req: EnrollRequest):
        det = s["detector"]
        if det is None:
            raise HTTPException(503, "detector not available")
        accepted = []
        rejected = []
        for i, frame_data in enumerate(req.frames):
            frame = np.array(frame_data, dtype=np.uint8)
            faces = det.detect(frame)
            if not faces:
                rejected.append({"frame": i, "reason": "no_face"})
                continue
            face = faces[0]
            ok, reason = check_quality(face)
            if not ok:
                rejected.append({"frame": i, "reason": reason})
                continue
            emb = extract_embedding(face)
            if emb is not None:
                accepted.append(emb)
            else:
                rejected.append({"frame": i, "reason": "no_embedding"})
        if len(accepted) < 3:
            raise HTTPException(400, f"Too few valid frames: {len(accepted)} accepted, need >=3")
        if s["backend"] is None:
            raise HTTPException(503, "backend not available")
        result = await s["backend"].enroll(req.personId, accepted)
        if result is None:
            raise HTTPException(502, "backend enrollment failed")
        return {"personId": req.personId, "accepted": len(accepted), "rejected": rejected, "backend_result": result}

    @app.post("/enroll/capture")
    async def enroll_capture(req: EnrollCaptureRequest):
        # Release main capture to free camera device (Windows CAP_DSHOW locks)
        old = s["capture"]
        s["capture"] = None
        if old:
            await asyncio.to_thread(old.release)
        cap = await asyncio.to_thread(CameraCapture, "0")
        try:
            result = await _run_enrollment_from_camera(req.personId, cap, s["detector"], s["backend"])
            return result
        except RuntimeError as e:
            raise HTTPException(400, str(e))
        finally:
            await asyncio.to_thread(cap.release)
            try:
                s["capture"] = await asyncio.to_thread(CameraCapture, settings.camera_source)
            except RuntimeError:
                s["capture"] = None

    @app.post("/pose")
    async def get_pose(req: PoseRequest):
        det = s["detector"]
        if det is None:
            return {"detected": False, "yaw": 0.0, "pitch": 0.0}
        frame = decode_base64_frame(req.frame)
        if frame is None or frame.size == 0:
            return {"detected": False, "yaw": 0.0, "pitch": 0.0}
        faces = det.detect(frame)
        if not faces:
            return {"detected": False, "yaw": 0.0, "pitch": 0.0}
        face = faces[0]
        if face.get("pose"):
            pitch, yaw, _roll = face["pose"]
        else:
            yaw, pitch = estimate_pose_from_kps(face.get("landmarks") or [])
        return {"detected": True, "yaw": round(float(yaw), 1), "pitch": round(float(pitch), 1)}

    @app.post("/enroll/webcam")
    async def enroll_webcam(req: EnrollWebcamRequest):
        det = s["detector"]
        if det is None:
            raise HTTPException(503, "detector not available")
        if len(req.frames) < 3 or len(req.frames) > 20:
            raise HTTPException(400, f"Need 3-20 frames, got {len(req.frames)}")
        accepted_embs = []
        face_crops = []
        poses = []
        rejected = []
        for i, b64 in enumerate(req.frames):
            frame = decode_base64_frame(b64)
            if frame is None or frame.size == 0:
                rejected.append({"frame": i, "reason": "decode_failed"})
                continue
            faces = det.detect(frame)
            if not faces:
                rejected.append({"frame": i, "reason": "no_face"})
                continue
            face = faces[0]
            ok, reason = check_quality(face)
            if not ok:
                rejected.append({"frame": i, "reason": reason})
                continue
            emb = extract_embedding(face)
            if emb is not None:
                accepted_embs.append(emb)
                crop = crop_face_b64(frame, face["bbox"])
                if crop:
                    face_crops.append(crop)
                # ── Detect pose for this frame ──
                if face.get("pose"):
                    pitch, yaw, _roll = face["pose"]
                else:
                    yaw, pitch = estimate_pose_from_kps(face.get("landmarks") or [])
                poses.append(classify_pose(yaw, pitch))
            else:
                rejected.append({"frame": i, "reason": "no_embedding"})
        if len(accepted_embs) < 3:
            raise HTTPException(400, f"Too few valid frames: {len(accepted_embs)} accepted, need >=3")
        if s["backend"] is None:
            raise HTTPException(503, "backend not available")
        result = await s["backend"].enroll(req.personId, accepted_embs, face_crops if face_crops else None, poses, replace=req.replace)
        if result is None:
            raise HTTPException(502, "backend enrollment failed")
        return {
            "personId": req.personId,
            "accepted": len(accepted_embs),
            "rejected": rejected,
            "poses": poses,
            "backend_result": result,
        }

    @app.post("/enroll/from-image")
    async def enroll_from_image(req: EnrollFromImageRequest):
        """Enroll a single face image (e.g. gate event crop) without requiring webcam capture.
        Extracts one embedding, detects pose, and stores it for the person.
        Use /enroll/webcam with replace=true later to upgrade to multi-angle webcam embeddings."""
        det = s["detector"]
        if det is None:
            raise HTTPException(503, "detector not available")
        frame = decode_base64_frame(req.frame)
        if frame is None or frame.size == 0:
            raise HTTPException(400, "Failed to decode image")
        faces = det.detect(frame)
        if not faces:
            raise HTTPException(400, "No face detected in image")
        face = faces[0]
        emb = extract_embedding(face)
        if emb is None:
            raise HTTPException(400, "Failed to extract embedding from image")
        crop = crop_face_b64(frame, face["bbox"])
        if face.get("pose"):
            pitch, yaw, _roll = face["pose"]
        else:
            yaw, pitch = estimate_pose_from_kps(face.get("landmarks") or [])
        pose = classify_pose(yaw, pitch)
        if s["backend"] is None:
            raise HTTPException(503, "backend not available")
        result = await s["backend"].enroll(req.personId, [emb], [crop] if crop else None, [pose])
        if result is None:
            raise HTTPException(502, "backend enrollment failed")
        return {
            "personId": req.personId,
            "accepted": 1,
            "poses": [pose],
            "backend_result": result,
        }

    @app.get("/stream/status")
    def stream_status():
        cap = s["capture"]
        roi = s.get("roi", {})
        return {
            "camera_open": cap is not None and cap.cap.isOpened() if cap else False,
            "detector_loaded": s["detector"] is not None,
            "capture_interval_ms": settings.capture_interval_ms,
            "camera_source": settings.camera_source,
            "direction": settings.direction,
            "stats": s["stats"],
            "roi": roi,
            "frame_size": s.get("frame_size", {"width": 0, "height": 0}),
        }

    @app.post("/roi")
    def set_roi(req: RoiRequest):
        if req.width < 0 or req.height < 0 or req.x < 0 or req.y < 0:
            raise HTTPException(400, "ROI coordinates must be non-negative")
        s["roi"] = {"x": req.x, "y": req.y, "width": req.width, "height": req.height}
        logger.info("ROI updated: x=%d y=%d w=%d h=%d", req.x, req.y, req.width, req.height)
        return {"status": "ok", "roi": s["roi"]}

    @app.get("/stream")
    async def stream():
        if s["capture"] is None:
            raise HTTPException(503, "camera not available")
        s["stream_connections"] += 1
        async def generate():
            try:
                while True:
                    frame = s["latest_frame_jpg"]
                    if frame is not None:
                        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                    await asyncio.sleep(0.05)
            finally:
                s["stream_connections"] = max(0, s["stream_connections"] - 1)
        return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.get("/events/recent")
    def recent_events(limit: int = 20):
        return list(reversed(list(s["events_log"])[-limit:]))

    @app.get("/cameras")
    def list_cameras():
        # Probe indices 0..9 for available cameras
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

        # Try to get friendly names on Windows via PowerShell
        friendly = {}
        if platform.system() == "Windows":
            try:
                script = 'Get-CimInstance -Namespace root/cimv2 -ClassName Win32_PnPEntity | Where-Object {$_.PNPClass -eq "Camera" -or $_.PNPClass -eq "Image"} | Select-Object FriendlyName | ConvertTo-Json -Compress'
                r = subprocess.run(["powershell", "-NoProfile", "-Command", script], capture_output=True, text=True, timeout=5)
                if r.returncode == 0 and r.stdout.strip():
                    names = json.loads(r.stdout)
                    if isinstance(names, dict):
                        names = [names]
                    for idx, dev in enumerate(names):
                        if idx < len(available) and dev.get("FriendlyName"):
                            friendly[available[idx]] = dev["FriendlyName"]
            except Exception:
                pass

        return [
            {"index": idx, "name": friendly.get(idx, f"Camera {idx}")}
            for idx in available
        ]

    @app.post("/restart")
    async def restart(req: RestartRequest):
        source = req.source
        if not source:
            raise HTTPException(400, "source is required")
        direction = req.direction
        if direction not in ("entry", "exit"):
            raise HTTPException(400, "direction must be 'entry' or 'exit'")
        logger.info("Restarting capture with source=%s direction=%s", source, direction)

        # Open and warm-up new capture before touching old one
        new_cap = await asyncio.to_thread(CameraCapture, source)
        test_frame = await asyncio.to_thread(new_cap.read_frame)
        if test_frame is None:
            await asyncio.to_thread(new_cap.release)
            raise HTTPException(502, f"Camera opened but first frame read failed for source: {source}")

        # Persist source + direction to config (atomic write via temp + rename)
        config_path = settings.video_source_config_path
        tmp_path = config_path + ".tmp"
        try:
            with open(tmp_path, "w") as f:
                json.dump({"camera_source": source, "direction": direction}, f)
            os.replace(tmp_path, config_path)  # atomic on Linux
        except OSError as e:
            await asyncio.to_thread(new_cap.release)
            raise HTTPException(500, f"Failed to persist config: {e}")

        # Swap atomically
        old = s["capture"]
        s["capture"] = new_cap
        settings.camera_source = source
        settings.direction = direction
        if old:
            await asyncio.to_thread(old.release)

        return {"status": "ok", "camera_source": source, "direction": direction}


async def _run_enrollment_from_camera(person_id: str, capture, detector, backend):
    if capture is None or detector is None:
        raise RuntimeError("Camera or detector not available")
    accepted = []
    face_crops = []
    rejected = []
    frames_needed = 5
    attempts = 0
    max_attempts = 100
    while len(accepted) < frames_needed and attempts < max_attempts:
        attempts += 1
        frame = capture.read_frame()
        if frame is None:
            await asyncio.sleep(0.1)
            continue
        faces = detector.detect(frame)
        if not faces:
            rejected.append({"attempt": attempts, "reason": "no_face"})
            continue
        face = faces[0]
        ok, reason = check_quality(face)
        if not ok:
            rejected.append({"attempt": attempts, "reason": reason})
            continue
        emb = extract_embedding(face)
        if emb is not None:
            accepted.append(emb)
            crop = crop_face_b64(frame, face["bbox"])
            if crop:
                face_crops.append(crop)
        else:
            rejected.append({"attempt": attempts, "reason": "no_embedding"})
        await asyncio.sleep(0.2)
    if len(accepted) < frames_needed:
        raise RuntimeError(f"Only got {len(accepted)}/{frames_needed} valid frames")
    if backend is None:
        raise RuntimeError("Backend not available")
    result = await backend.enroll(person_id, accepted, face_crops if face_crops else None)
    if result is None:
        raise RuntimeError("Backend enrollment failed")
    return {"personId": person_id, "accepted": len(accepted), "rejected": rejected, "backend_result": result}
