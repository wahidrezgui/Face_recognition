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
    gate_id: str | None = None


class ProcessingFpsRequest(BaseModel):
    fps: int


class ModelProfileRequest(BaseModel):
    profile: str  # "auto" | "performance" | "lite"


class DetSizeRequest(BaseModel):
    width: int
    height: int


class HikvisionConfigRequest(BaseModel):
    url: str          # camera base URL, e.g. "http://192.168.1.64"; empty = disable
    user: str = "admin"
    password: str = ""
    event_ttl_ms: int = 5000
    event_types: str = "VMD,fielddetection,linedetection"  # comma-separated; empty = all
    detection_target: str = ""  # e.g. "human"; empty = no filter


class MotionConfigRequest(BaseModel):
    threshold: float       # fraction of pixels that must change; 0 = disabled
    pixel_threshold: int   # per-pixel magnitude (0–255) to count as changed


class DetectScaleRequest(BaseModel):
    max_width: int  # target detection width; 0 = disabled (use full resolution)


def _hikvision_status(state: dict) -> dict:
    hik = state.get("hikvision")
    return {
        "enabled": hik is not None,
        "connected": hik.is_connected() if hik else False,
        "active": hik.is_active() if hik else False,
        "url": settings.hikvision_url or None,
        "event_types": settings.hikvision_event_types or "all",
        "event_ttl_ms": settings.hikvision_event_ttl_ms,
        "detection_target": settings.hikvision_detection_target or "any",
    }


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
            ok, reason = check_quality(face, frame)
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
            pitch = -pitch  # InsightFace: +pitch=up; our convention: +pitch=down
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
            try:
                faces = await asyncio.to_thread(det.detect, frame)
            except Exception as exc:
                logger.error("Detection failed for frame %d in enroll/webcam: %s", i, exc, exc_info=True)
                rejected.append({"frame": i, "reason": f"detection_error:{exc}"})
                continue
            if not faces:
                rejected.append({"frame": i, "reason": "no_face"})
                continue
            face = faces[0]
            ok, reason = check_quality(face, frame)
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
                    pitch = -pitch
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
        """Enroll a single face image without requiring webcam capture.

        Handles two source types automatically:
        - Tight gate-camera crops (shorter side < 400 px): adds 40% padding so
          SCRFD has enough context to locate landmarks.
        - Full photos from disk (shorter side >= 400 px): runs detection directly
          on the image; large inputs are downscaled to 1024 px (longer side) to
          keep the IPC payload to the detector subprocess manageable.

        Picks the most prominent face (highest confidence × largest bbox area) when
        multiple faces are present. Falls back to direct ArcFace embedding when
        SCRFD finds nothing.
        """
        det = s["detector"]
        if det is None:
            raise HTTPException(503, "detector not available")
        frame = decode_base64_frame(req.frame)
        if frame is None or frame.size == 0:
            raise HTTPException(400, "Failed to decode image")

        h, w = frame.shape[:2]
        shorter = min(h, w)

        if shorter < 400:
            # Tight gate-camera crop — add context padding before detection.
            pad_y = max(int(h * 0.4), 20)
            pad_x = max(int(w * 0.4), 20)
            detect_frame = cv2.copyMakeBorder(
                frame, pad_y, pad_y, pad_x, pad_x, cv2.BORDER_REPLICATE
            )
            dh, dw = detect_frame.shape[:2]
            if min(dh, dw) < 160:
                scale = 160 / min(dh, dw)
                detect_frame = cv2.resize(
                    detect_frame,
                    (int(dw * scale), int(dh * scale)),
                    interpolation=cv2.INTER_LANCZOS4,
                )
        else:
            # Full photo — detect on the image as-is. Downscale only when the
            # longer side exceeds 1024 px to limit IPC payload to the subprocess.
            max_dim = 1024
            longer = max(h, w)
            if longer > max_dim:
                scale = max_dim / longer
                detect_frame = cv2.resize(
                    frame,
                    (int(w * scale), int(h * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            else:
                detect_frame = frame.copy()

        try:
            faces = await asyncio.to_thread(det.detect, detect_frame)
        except Exception as exc:
            logger.error("Detection failed in enroll/from-image: %s", exc, exc_info=True)
            raise HTTPException(500, f"Face detection failed: {exc}")

        if faces:
            # Pick the most prominent face when multiple are present.
            def _face_score(f: dict) -> float:
                x1, y1, x2, y2 = f["bbox"]
                return f["confidence"] * (x2 - x1) * (y2 - y1)
            face = max(faces, key=_face_score)
            emb = extract_embedding(face)
            if emb is None:
                raise HTTPException(400, "Failed to extract embedding from image")
            crop = crop_face_b64(detect_frame, face["bbox"])
            if face.get("pose"):
                pitch, yaw, _roll = face["pose"]
                pitch = -pitch
            else:
                yaw, pitch = estimate_pose_from_kps(face.get("landmarks") or [])
            pose = classify_pose(yaw, pitch)
        else:
            # Padding retry: give SCRFD more context before falling back to embed_crop.
            retry_pad = max(int(h * 0.4), 20)
            retry_frame = cv2.copyMakeBorder(
                frame, retry_pad, retry_pad, retry_pad, retry_pad, cv2.BORDER_REPLICATE
            )
            retry_faces = []
            try:
                retry_faces = await asyncio.to_thread(det.detect, retry_frame)
            except Exception as exc:
                logger.debug("enroll/from-image: padding retry detection error: %s", exc)

            if retry_faces:
                face = max(retry_faces, key=lambda f: f["confidence"] * (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1]))
                emb = extract_embedding(face)
                if emb is not None:
                    crop = crop_face_b64(retry_frame, face["bbox"])
                    if face.get("pose"):
                        pitch, yaw, _roll = face["pose"]
                        pitch = -pitch
                    else:
                        yaw, pitch = estimate_pose_from_kps(face.get("landmarks") or [])
                    pose = classify_pose(yaw, pitch)
                    logger.info("enroll/from-image: face found after padding retry — using aligned embedding")
                else:
                    retry_faces = []  # force last-resort path below

            if not retry_faces:
                # Last resort: direct ArcFace on the whole image with estimated affine alignment.
                logger.warning(
                    "enroll/from-image: no face after padding retry — falling back to direct ArcFace embedding"
                )
                emb = await asyncio.to_thread(det.embed_crop, frame)
                if emb is None:
                    raise HTTPException(400, "No face detected in image and direct embedding also failed")
                crop = crop_face_b64(frame, [0, 0, frame.shape[1], frame.shape[0]])
                pose = "frontal"

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
        try:
            cap = s["capture"]
            det = s.get("detector")
            roi = s.get("roi", {})
            # isOpened() can raise a cv2 exception if the capture handle is in a bad state
            # (e.g., during DSHOW reconnect on Windows). Isolate it so a camera glitch never
            # returns HTTP 500, which the C# backend interprets as the gate being offline.
            try:
                camera_open = cap is not None and cap.cap.isOpened()
            except Exception:
                camera_open = False
            return {
                "camera_open": camera_open,
                "detector_loaded": det is not None,
                "model_profile": settings.model_profile,
                "active_model": det.model_package if det else None,
                "active_det_size": list(det.det_size) if det else None,
                "active_provider": det.active_provider if det else None,
                "provider_chain": det.provider_chain if det else None,
                "motion_gate": {
                    "enabled": settings.motion_threshold > 0,
                    "threshold": settings.motion_threshold,
                    "pixel_threshold": settings.motion_pixel_threshold,
                    "skipped_total": s["stats"].get("motion_skipped", 0),
                },
                "hikvision": _hikvision_status(s),
                "detect_max_width": settings.detect_max_width,
                "window_duration_ms": settings.window_duration_ms,
                "max_identity_requests_per_window": settings.max_identity_requests_per_window,
                "greeting_delay_ms": settings.greeting_delay_ms,
                "camera_source": settings.camera_source,
                "direction": settings.direction,
                "processing_fps": s.get("processing_fps", settings.processing_fps),
                "stats": s["stats"],
                "roi": roi,
                "frame_size": s.get("frame_size", {"width": 0, "height": 0}),
            }
        except Exception as e:
            logger.error("stream_status: unexpected error: %s", e, exc_info=True)
            # Return a minimal 200 so the C# backend does not flip the gate to offline.
            return {
                "camera_open": False,
                "detector_loaded": False,
                "error": str(e),
                "stats": s.get("stats", {}),
            }

    @app.post("/roi")
    def set_roi(req: RoiRequest):
        if req.width < 0 or req.height < 0 or req.x < 0 or req.y < 0:
            raise HTTPException(400, "ROI coordinates must be non-negative")
        s["roi"] = {"x": req.x, "y": req.y, "width": req.width, "height": req.height}
        logger.info("ROI updated: x=%d y=%d w=%d h=%d", req.x, req.y, req.width, req.height)
        return {"status": "ok", "roi": s["roi"]}

    @app.get("/config/processing-fps")
    def get_processing_fps():
        return {"fps": s.get("processing_fps", settings.processing_fps)}

    @app.post("/config/processing-fps")
    async def set_processing_fps(req: ProcessingFpsRequest):
        if req.fps < 1 or req.fps > 30:
            raise HTTPException(400, "fps must be between 1 and 30")
        s["processing_fps"] = req.fps
        settings.processing_fps = req.fps
        logger.info("Processing FPS set to %d", req.fps)
        return {"fps": req.fps}

    @app.get("/config/model-profile")
    def get_model_profile():
        det = s.get("detector")
        return {
            "configured_profile": settings.model_profile,
            "active_profile": det.resolved_profile if det else None,
            "active_model": det.model_package if det else None,
            "active_det_size": list(det.det_size) if det else None,
            "active_provider": det.active_provider if det else None,
            "provider_chain": det.provider_chain if det else None,
            "note": "Changes to profile take effect after restart.",
        }

    @app.post("/config/model-profile")
    def set_model_profile(req: ModelProfileRequest):
        valid = {"auto", "performance", "lite"}
        if req.profile not in valid:
            raise HTTPException(400, f"profile must be one of: {', '.join(sorted(valid))}")
        settings.model_profile = req.profile
        logger.info("Model profile set to '%s' (takes effect on next restart)", req.profile)
        det = s.get("detector")
        return {
            "configured_profile": req.profile,
            "active_profile": det.resolved_profile if det else None,
            "active_model": det.model_package if det else None,
            "note": "Restart the service to load the new model.",
        }

    _DET_SIZE_PRESETS = [
        {"size": [160, 160], "label": "ultra-lite", "note": "Fastest; reduced accuracy at distance or for small faces"},
        {"size": [320, 320], "label": "lite",        "note": "Default for CPU — good balance of speed and accuracy"},
        {"size": [480, 480], "label": "balanced",    "note": "~2.25× cost vs 320; better for distant or angled faces"},
        {"size": [640, 640], "label": "full",        "note": "Max accuracy; default for GPU"},
    ]

    @app.get("/config/det-size")
    def get_det_size():
        det = s.get("detector")
        override = settings.detector_input_size
        return {
            "active_det_size": list(det.det_size) if det else None,
            "configured_override": list(override) if override is not None else None,
            "note": "Set an override to decouple det_size from the model profile. Takes effect after restart.",
            "presets": _DET_SIZE_PRESETS,
        }

    @app.post("/config/det-size")
    def set_det_size(req: DetSizeRequest):
        valid_sizes = {s_["size"][0] for s_ in _DET_SIZE_PRESETS}
        if req.width not in valid_sizes or req.height not in valid_sizes:
            raise HTTPException(
                400,
                f"width and height must each be one of: {sorted(valid_sizes)}. Use DELETE /config/det-size to clear the override.",
            )
        settings.detector_input_size = (req.width, req.height)
        logger.info("det_size override set to (%d, %d) — takes effect after restart", req.width, req.height)
        det = s.get("detector")
        return {
            "configured_override": [req.width, req.height],
            "active_det_size": list(det.det_size) if det else None,
            "note": "Restart the service to apply the new detection size.",
        }

    @app.delete("/config/det-size")
    def clear_det_size():
        settings.detector_input_size = None
        logger.info("det_size override cleared — profile default will be used after restart")
        det = s.get("detector")
        return {
            "configured_override": None,
            "active_det_size": list(det.det_size) if det else None,
            "note": "Restart to revert to the profile's default det_size.",
        }

    @app.get("/config/motion")
    def get_motion_config():
        return {
            "enabled": settings.motion_threshold > 0,
            "threshold": settings.motion_threshold,
            "pixel_threshold": settings.motion_pixel_threshold,
            "motion_skipped_total": s["stats"].get("motion_skipped", 0),
            "note": "threshold=0 disables the gate entirely.",
        }

    @app.post("/config/motion")
    def set_motion_config(req: MotionConfigRequest):
        if req.threshold < 0 or req.threshold > 1:
            raise HTTPException(400, "threshold must be between 0 and 1")
        if req.pixel_threshold < 1 or req.pixel_threshold > 255:
            raise HTTPException(400, "pixel_threshold must be between 1 and 255")
        settings.motion_threshold = req.threshold
        settings.motion_pixel_threshold = req.pixel_threshold
        logger.info(
            "Motion gate updated — threshold=%.4f pixel_threshold=%d",
            req.threshold, req.pixel_threshold,
        )
        return {
            "enabled": req.threshold > 0,
            "threshold": req.threshold,
            "pixel_threshold": req.pixel_threshold,
        }

    @app.get("/config/hikvision")
    def get_hikvision_config():
        return _hikvision_status(s)

    @app.post("/config/hikvision")
    async def set_hikvision_config(req: HikvisionConfigRequest):
        from .hikvision import HikvisionEventListener
        if req.event_ttl_ms < 100:
            raise HTTPException(400, "event_ttl_ms must be >= 100")
        # Stop existing listener if any
        old = s.get("hikvision")
        if old:
            old.stop()
            s["hikvision"] = None
        # Persist settings
        settings.hikvision_url = req.url
        settings.hikvision_user = req.user
        settings.hikvision_password = req.password
        settings.hikvision_event_ttl_ms = req.event_ttl_ms
        settings.hikvision_event_types = req.event_types
        settings.hikvision_detection_target = req.detection_target
        if req.url:
            hik = await asyncio.to_thread(
                HikvisionEventListener,
                req.url, req.user, req.password, req.event_types, req.event_ttl_ms,
                req.detection_target,
            )
            s["hikvision"] = hik
            logger.info(
                "Hikvision listener restarted → %s  types=%s  ttl=%dms",
                req.url, req.event_types or "all", req.event_ttl_ms,
            )
        else:
            logger.info("Hikvision listener disabled")
        return _hikvision_status(s)

    @app.get("/camera-events")
    def get_camera_events(limit: int = 30):
        """Return recent Hikvision ISAPI events for dashboard monitoring."""
        hik = s.get("hikvision")
        status = _hikvision_status(s)
        events = hik.get_recent_events()[:limit] if hik else []
        return {**status, "events": events}

    _DETECT_SCALE_PRESETS = [
        {"max_width": 0,    "label": "disabled", "note": "Full camera resolution (default)"},
        {"max_width": 960,  "label": "960p",     "note": "Half of 1920 — 4× less data than 1080p, imperceptible quality loss"},
        {"max_width": 640,  "label": "640p",     "note": "~9× less data than 1080p — good for CPU-only 720p+ cameras"},
        {"max_width": 480,  "label": "480p",     "note": "~16× less data — pairs well with the lite model profile"},
    ]

    @app.get("/config/detect-scale")
    def get_detect_scale():
        det = s.get("detector")
        return {
            "detect_max_width": settings.detect_max_width,
            "enabled": settings.detect_max_width > 0,
            "camera_width": s.get("frame_size", {}).get("width"),
            "effective_det_size": list(det.det_size) if det else None,
            "note": "Frames are downscaled to detect_max_width before detection; streaming stays at full resolution.",
            "presets": _DETECT_SCALE_PRESETS,
        }

    @app.post("/config/detect-scale")
    def set_detect_scale(req: DetectScaleRequest):
        if req.max_width < 0:
            raise HTTPException(400, "max_width must be >= 0 (0 = disabled)")
        if req.max_width != 0 and req.max_width < 160:
            raise HTTPException(400, "max_width must be 0 (disabled) or >= 160")
        settings.detect_max_width = req.max_width
        logger.info("detect_max_width set to %d", req.max_width)
        return {
            "detect_max_width": req.max_width,
            "enabled": req.max_width > 0,
        }

    @app.get("/metrics")
    def metrics():
        stats = s["stats"]
        gate_id = settings.gate_id
        cb_state = 1 if stats.get("circuit_open") else 0
        backend_client = s.get("backend")
        buffer_pending = 0
        if backend_client and hasattr(backend_client, "_local_buffer"):
            buffer_pending = backend_client._local_buffer.pending_count()
        lines = [
            "# HELP gatevision_frames_captured_total Total frames captured",
            f"# TYPE gatevision_frames_captured_total counter",
            f'gatevision_frames_captured_total{{gate_id="{gate_id}"}} {stats.get("frames_captured", 0)}',
            "# HELP gatevision_faces_detected_total Total faces detected",
            f"# TYPE gatevision_faces_detected_total counter",
            f'gatevision_faces_detected_total{{gate_id="{gate_id}"}} {stats.get("faces_detected", 0)}',
            "# HELP gatevision_events_sent_total Identity requests sent to central",
            f"# TYPE gatevision_events_sent_total counter",
            f'gatevision_events_sent_total{{gate_id="{gate_id}"}} {stats.get("events_sent", 0)}',
            "# HELP gatevision_backend_errors_total Backend errors total",
            f"# TYPE gatevision_backend_errors_total counter",
            f'gatevision_backend_errors_total{{gate_id="{gate_id}"}} {stats.get("backend_errors", 0)}',
            "# HELP gatevision_circuit_breaker_state 1=OPEN 0=CLOSED",
            f"# TYPE gatevision_circuit_breaker_state gauge",
            f'gatevision_circuit_breaker_state{{gate_id="{gate_id}"}} {cb_state}',
            "# HELP gatevision_windows_processed Total interaction windows processed",
            f"# TYPE gatevision_windows_processed counter",
            f'gatevision_windows_processed{{gate_id="{gate_id}"}} {stats.get("windows_processed", 0)}',
            "# HELP gatevision_local_buffer_pending Events buffered awaiting replay",
            f"# TYPE gatevision_local_buffer_pending gauge",
            f'gatevision_local_buffer_pending{{gate_id="{gate_id}"}} {buffer_pending}',
        ]
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; charset=utf-8")

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
                    await asyncio.sleep(0.033)
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

    @app.post("/stop")
    async def stop():
        """Gracefully shut down the AI service."""
        import signal
        logger.info("Shutdown requested via /stop endpoint")
        loop = asyncio.get_event_loop()
        loop.call_later(0.5, lambda: os.kill(os.getpid(), signal.SIGINT))
        return {"status": "stopping"}

    @app.post("/restart")
    async def restart(req: RestartRequest):
        source = req.source
        if not source:
            raise HTTPException(400, "source is required")
        direction = req.direction
        if direction not in ("entry", "exit"):
            raise HTTPException(400, "direction must be 'entry' or 'exit'")
        gate_id = (req.gate_id or "").strip() or settings.gate_id
        logger.info("Restarting capture with source=%s direction=%s gate_id=%s", source, direction, gate_id)

        # Open and warm-up new capture before touching old one
        new_cap = await asyncio.to_thread(CameraCapture, source)
        test_frame = await asyncio.to_thread(new_cap.read_frame)
        if test_frame is None:
            await asyncio.to_thread(new_cap.release)
            raise HTTPException(502, f"Camera opened but first frame read failed for source: {source}")

        # Swap atomically — config is persisted to DB by the .NET API caller
        old = s["capture"]
        s["capture"] = new_cap
        settings.camera_source = source
        settings.direction = direction
        settings.gate_id = gate_id
        if old:
            await asyncio.to_thread(old.release)

        return {"status": "ok", "camera_source": source, "direction": direction, "gate_id": gate_id}


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
        ok, reason = check_quality(face, frame)
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
