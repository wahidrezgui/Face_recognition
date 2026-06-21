"""Fetch gate processing config from the .NET API at startup."""

from __future__ import annotations

import logging
import os
import time
import uuid

import httpx

from .config import settings

logger = logging.getLogger("gate_vision_ai")


def _config_urls(gate_id: str) -> list[str]:
    base = settings.net_backend_url.rstrip("/")
    urls: list[str] = []
    if gate_id and gate_id != "default":
        try:
            uuid.UUID(gate_id)
            urls.append(f"{base}/api/v1/gates/{gate_id}/config")
        except ValueError:
            logger.warning("GV_GATE_ID=%r is not a valid UUID — trying /gates/me/config", gate_id)
    if settings.net_api_key:
        urls.append(f"{base}/api/v1/gates/me/config")
    return urls


def _apply_cfg(cfg: dict) -> None:
    env = os.environ
    if "gate_id" in cfg and cfg["gate_id"]:
        settings.gate_id = str(cfg["gate_id"])
    if "camera_source" in cfg and "GV_CAMERA_SOURCE" not in env:
        settings.camera_source = str(cfg["camera_source"])
    if "processing_fps" in cfg and "GV_PROCESSING_FPS" not in env:
        settings.processing_fps = int(cfg["processing_fps"])
    if "model_profile" in cfg and "GV_MODEL_PROFILE" not in env:
        settings.model_profile = str(cfg["model_profile"])
    if cfg.get("detector_input_size") and "GV_DETECTOR_INPUT_SIZE" not in env:
        settings.detector_input_size = tuple(cfg["detector_input_size"])
    if "motion_threshold" in cfg and "GV_MOTION_THRESHOLD" not in env:
        settings.motion_threshold = float(cfg["motion_threshold"])
    if "motion_pixel_threshold" in cfg and "GV_MOTION_PIXEL_THRESHOLD" not in env:
        settings.motion_pixel_threshold = int(cfg["motion_pixel_threshold"])
    if "detect_max_width" in cfg and "GV_DETECT_MAX_WIDTH" not in env:
        settings.detect_max_width = int(cfg["detect_max_width"])
    if "hikvision_url" in cfg and "GV_HIKVISION_URL" not in env:
        settings.hikvision_url = str(cfg["hikvision_url"])
    if "hikvision_user" in cfg and "GV_HIKVISION_USER" not in env:
        settings.hikvision_user = str(cfg["hikvision_user"])
    if "hikvision_password" in cfg and "GV_HIKVISION_PASSWORD" not in env:
        settings.hikvision_password = str(cfg["hikvision_password"])
    if "hikvision_event_ttl_ms" in cfg and "GV_HIKVISION_EVENT_TTL_MS" not in env:
        settings.hikvision_event_ttl_ms = int(cfg["hikvision_event_ttl_ms"])
    if "hikvision_event_types" in cfg and "GV_HIKVISION_EVENT_TYPES" not in env:
        settings.hikvision_event_types = str(cfg["hikvision_event_types"])
    if "hikvision_detection_target" in cfg and "GV_HIKVISION_DETECTION_TARGET" not in env:
        settings.hikvision_detection_target = str(cfg["hikvision_detection_target"])
    if "min_face_confidence" in cfg and "GV_MIN_FACE_CONFIDENCE" not in env:
        settings.min_face_confidence = float(cfg["min_face_confidence"])
        settings.detector_confidence = float(cfg["min_face_confidence"])
    if "identify_confidence_threshold" in cfg and "GV_IDENTIFY_CONFIDENCE_THRESHOLD" not in env:
        settings.auto_improve_max_conf = float(cfg["identify_confidence_threshold"])
    if "min_match_score" in cfg and "GV_MIN_MATCH_SCORE" not in env:
        settings.auto_improve_min_conf = max(0.55, float(cfg["min_match_score"]) + 0.05)
    if "tracker_max_lost_s" in cfg and "GV_TRACKER_MAX_LOST_S" not in env:
        settings.tracker_max_lost_s = float(cfg["tracker_max_lost_s"])
    if "log_unknown" in cfg and "GV_LOG_UNKNOWN" not in env:
        settings.log_unknown = bool(cfg["log_unknown"])
    if "training_mode" in cfg and "GV_TRAINING_MODE" not in env:
        settings.training_mode = bool(cfg["training_mode"])


def load_gate_config_from_api() -> bool:
    """Pull gate config from API. Returns True when config was applied."""
    urls = _config_urls(settings.gate_id)
    if not urls:
        logger.warning(
            "Cannot fetch gate config — set GV_GATE_ID to a gate UUID and/or GV_NET_API_KEY"
        )
        return False

    headers = {"X-API-Key": settings.net_api_key} if settings.net_api_key else {}
    cfg: dict | None = None
    last_status: int | None = None

    for url in urls:
        for attempt in range(1, 6):
            try:
                resp = httpx.get(url, headers=headers, timeout=5.0)
                last_status = resp.status_code
                if resp.status_code == 200:
                    cfg = resp.json()
                    logger.info("Gate config loaded from %s", url)
                    break
                logger.warning(
                    "Gate config fetch %s attempt %d/5 returned HTTP %d",
                    url, attempt, resp.status_code,
                )
            except Exception as exc:
                logger.warning(
                    "Gate config fetch %s attempt %d/5 failed (%s)",
                    url, attempt, exc,
                )
            if attempt < 5:
                time.sleep(2)
        if cfg is not None:
            break

    if cfg is None:
        logger.error(
            "Gate config could not be fetched after retries (last HTTP %s) — "
            "running with env/defaults (camera=%s)",
            last_status, settings.camera_source,
        )
        return False

    _apply_cfg(cfg)
    logger.info(
        "Gate config applied — gate=%s  camera=%s  fps=%d  "
        "hikvision=%s  motion_threshold=%.3f  detect_max_width=%d  "
        "min_face_conf=%.2f  identify_threshold=%.2f  "
        "log_unknown=%s  training_mode=%s",
        settings.gate_id, settings.camera_source, settings.processing_fps,
        settings.hikvision_url or "(none)", settings.motion_threshold, settings.detect_max_width,
        settings.min_face_confidence, settings.auto_improve_max_conf,
        settings.log_unknown, settings.training_mode,
    )
    return True
