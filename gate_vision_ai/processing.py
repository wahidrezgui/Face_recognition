import asyncio
import logging
import numpy as np
from cachetools import TTLCache
from .config import settings
from .quality import check_quality, crop_face_b64, face_sharpness_score
from .embedder import extract_embedding

logger = logging.getLogger(__name__)

_AUTO_IMPROVE_COOLDOWN = 300
# TTLCache bounds memory (max 1000 entries) and auto-expires cooldowns after 300s.
_auto_improve_seen: TTLCache = TTLCache(maxsize=1000, ttl=_AUTO_IMPROVE_COOLDOWN)


async def _background_improve(backend, person_id: str, embedding: np.ndarray, crop: str | None) -> None:
    try:
        # Do not pass crop: auto-improve only updates the vector, not the visible face gallery
        await backend.enroll(person_id, [embedding])
        logger.debug("Auto-improved embedding for person %s", person_id)
    except Exception as exc:
        logger.debug("Auto-improve skipped for person %s: %s", person_id, exc)


async def process_single_face(face: dict, frame: np.ndarray, captured_at: str, backend, track_id: int = 0) -> dict:
    ok, reason = check_quality(face, frame)
    if not ok:
        return {"quality": ok, "reason": reason}
    embedding = extract_embedding(face)
    if embedding is None:
        return {"quality": False, "reason": "no_embedding"}
    confidence = face["confidence"]
    face_crop_b64 = crop_face_b64(frame, face["bbox"])
    age = face.get("age")
    gender = face.get("gender")
    emotion = None  # not yet detected by InsightFace
    result = await backend.identify(embedding, confidence, captured_at, face_crop_b64, track_id, age, gender, emotion) if backend else None

    # Propagate backend error states to the top level so callers can branch on them directly.
    if result and (result.get("circuit_open") or result.get("backend_down")):
        return result

    # ── Phase 3: auto-improve embeddings for moderate-confidence identifications ──
    if result and backend:
        person_id = result.get("personId")
        match_conf = result.get("confidence", 0)
        if person_id and settings.auto_improve_min_conf <= match_conf <= settings.auto_improve_max_conf:
            if person_id not in _auto_improve_seen:
                sharpness = face_sharpness_score(frame, face["bbox"])
                if sharpness >= settings.auto_improve_min_sharpness:
                    _auto_improve_seen[person_id] = True
                    asyncio.create_task(_background_improve(backend, person_id, embedding, face_crop_b64))
                else:
                    logger.debug("Auto-improve skipped for %s: sharpness=%.1f < %.1f",
                                 person_id, sharpness, settings.auto_improve_min_sharpness)

    return {"quality": True, "embedding": embedding.tolist(), "match": result}
