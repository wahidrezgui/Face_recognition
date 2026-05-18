import numpy as np
from .quality import check_quality, crop_face_b64
from .embedder import extract_embedding


async def process_single_face(face: dict, frame: np.ndarray, captured_at: str, direction: str, backend, track_id: int = 0) -> dict:
    ok, reason = check_quality(face)
    if not ok:
        return {"quality": ok, "reason": reason}
    embedding = extract_embedding(face)
    if embedding is None:
        return {"quality": False, "reason": "no_embedding"}
    confidence = face["confidence"]
    face_crop_b64 = crop_face_b64(frame, face["bbox"])
    result = await backend.identify(embedding, confidence, captured_at, direction, face_crop_b64, track_id) if backend else None
    return {"quality": True, "embedding": embedding.tolist(), "match": result}
