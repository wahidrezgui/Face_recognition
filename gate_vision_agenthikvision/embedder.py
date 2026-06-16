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
