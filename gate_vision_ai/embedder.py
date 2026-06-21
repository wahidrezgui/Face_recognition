import numpy as np
from typing import Optional


def extract_embedding(face_data: dict) -> Optional[np.ndarray]:
    return face_data.get("embedding")


def average_embeddings(
    embeddings: list[np.ndarray],
    weights: list[float] | None = None,
) -> np.ndarray:
    if weights is None:
        weights = [1.0] * len(embeddings)
    stacked = np.stack(embeddings)
    w = np.array(weights, dtype=np.float32) / sum(weights)
    return (stacked.T * w).sum(axis=1).astype(np.float32)


def deduplicate_embeddings(
    embeddings: list[np.ndarray],
    max_sim: float = 0.95,
) -> list[np.ndarray]:
    """Drop embeddings too similar to an already-kept one.

    ArcFace outputs L2-normalised vectors, so cosine similarity == dot product.
    max_sim >= 1.0 disables deduplication entirely.
    """
    if max_sim >= 1.0 or not embeddings:
        return embeddings
    kept: list[np.ndarray] = []
    for emb in embeddings:
        if not kept or max(float(np.dot(emb, k)) for k in kept) < max_sim:
            kept.append(emb)
    return kept
