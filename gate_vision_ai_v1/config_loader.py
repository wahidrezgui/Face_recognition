"""Fetch per-gate config from the .NET API at startup and apply to settings.

Priority (highest → lowest):
  1. GV1_* environment variables  — always win, never overwritten
  2. Gates table (this loader)     — fills anything not set via env
  3. .env file defaults            — baseline fallback
"""

from __future__ import annotations

import logging
import os
import time
import uuid

import httpx

from .config import settings

logger = logging.getLogger("gate_vision_ai_v1")

# Map from DB field name → (settings attribute, env-var override name)
# Only fields relevant to v1 are mapped; Hikvision fields are omitted.
_FIELD_MAP: list[tuple[str, str, str]] = [
    ("camera_source",                "camera_url",             "GV1_CAMERA_URL"),
    ("processing_fps",               "processing_fps",         "GV1_PROCESSING_FPS"),
    ("motion_threshold",             "motion_threshold",       "GV1_MOTION_THRESHOLD"),
    ("motion_pixel_threshold",       "motion_pixel_threshold", "GV1_MOTION_PIXEL_THRESHOLD"),
    ("detect_max_width",             "detect_max_width",       "GV1_DETECT_MAX_WIDTH"),
    ("min_face_confidence",          "min_face_confidence",    "GV1_MIN_FACE_CONFIDENCE"),
    ("tracker_max_lost_s",           "tracker_max_lost_s",     "GV1_TRACKER_MAX_LOST_S"),
    ("min_match_score",              "recognition_threshold",  "GV1_RECOGNITION_THRESHOLD"),
    ("identify_confidence_threshold","identify_min_score",     "GV1_IDENTIFY_MIN_SCORE"),
    ("refire_score_delta",           "refire_score_delta",     "GV1_REFIRE_SCORE_DELTA"),
    ("min_track_hits",               "min_track_hits",         "GV1_MIN_TRACK_HITS"),
    ("log_unknown",                  "log_unknown",            "GV1_LOG_UNKNOWN"),
    ("training_mode",                "training_mode",          "GV1_TRAINING_MODE"),
]


def _config_urls() -> list[str]:
    base = settings.net_backend_url.rstrip("/")
    if not base:
        return []
    urls: list[str] = []
    gid = settings.gate_id
    if gid and gid != "default":
        try:
            uuid.UUID(gid)
            urls.append(f"{base}/api/v1/gates/{gid}/config")
        except ValueError:
            logger.warning("GV1_GATE_ID=%r is not a valid UUID — trying /gates/me/config", gid)
    if settings.net_api_key:
        urls.append(f"{base}/api/v1/gates/me/config")
    return urls


def _apply(cfg: dict) -> None:
    env = os.environ

    # gate_id — always update from response if present
    if "gate_id" in cfg and cfg["gate_id"]:
        settings.gate_id = str(cfg["gate_id"])

    for db_field, attr, env_key in _FIELD_MAP:
        if db_field not in cfg or cfg[db_field] is None:
            continue
        if env_key in env:
            # env var explicitly set — respect it, skip the DB value
            continue
        val = cfg[db_field]
        try:
            current = getattr(settings, attr)
            if isinstance(current, bool):   # bool before int — bool is a subclass of int
                val = bool(val)
            elif isinstance(current, float):
                val = float(val)
            elif isinstance(current, int):
                val = int(val)
            else:
                val = str(val)
            setattr(settings, attr, val)
        except Exception as exc:
            logger.warning("config_loader: could not apply %s=%r: %s", db_field, val, exc)

    # model_profile → model_pack mapping
    if "model_profile" in cfg and cfg["model_profile"] and "GV1_MODEL_PACK" not in env:
        profile = str(cfg["model_profile"]).lower()
        pack = "buffalo_l" if profile == "performance" else "buffalo_s"
        settings.model_pack = pack


def load_gate_config_from_api() -> bool:
    """Pull gate config from the .NET API. Returns True when config was applied."""
    urls = _config_urls()
    if not urls:
        logger.info(
            "config_loader: GV1_NET_BACKEND_URL not set — skipping DB config fetch, "
            "using .env / env-var values only"
        )
        return False

    headers = {"X-API-Key": settings.net_api_key} if settings.net_api_key else {}
    cfg: dict | None = None

    for url in urls:
        for attempt in range(1, 6):
            try:
                resp = httpx.get(url, headers=headers, timeout=5.0)
                if resp.status_code == 200:
                    cfg = resp.json()
                    logger.info("Gate config loaded from %s", url)
                    break
                logger.warning(
                    "Gate config fetch %s attempt %d/5 → HTTP %d",
                    url, attempt, resp.status_code,
                )
            except Exception as exc:
                logger.warning(
                    "Gate config fetch %s attempt %d/5 failed: %s",
                    url, attempt, exc,
                )
            if attempt < 5:
                time.sleep(2)
        if cfg is not None:
            break

    if cfg is None:
        logger.error(
            "Gate config could not be fetched — running with .env / env-var values "
            "(camera=%s fps=%d)",
            settings.camera_url, settings.processing_fps,
        )
        return False

    _apply(cfg)
    logger.info(
        "Gate config applied — gate=%s  camera=%s  fps=%d  "
        "motion_threshold=%.3f  detect_max_width=%d  "
        "min_face_conf=%.2f  recognition_threshold=%.2f  identify_min_score=%.2f  "
        "refire_score_delta=%.3f  model_pack=%s  "
        "log_unknown=%s  training_mode=%s",
        settings.gate_id,
        settings.camera_url,
        settings.processing_fps,
        settings.motion_threshold,
        settings.detect_max_width,
        settings.min_face_confidence,
        settings.recognition_threshold,
        settings.identify_min_score,
        settings.refire_score_delta,
        settings.model_pack,
        settings.log_unknown,
        settings.training_mode,
    )
    return True
