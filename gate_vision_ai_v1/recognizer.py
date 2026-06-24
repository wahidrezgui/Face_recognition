import logging
import threading
from dataclasses import dataclass
from typing import Any

import numpy as np

from .config import settings

logger = logging.getLogger(__name__)

_FAISS_AVAILABLE: bool | None = None


def _probe_faiss() -> bool:
    global _FAISS_AVAILABLE
    if _FAISS_AVAILABLE is None:
        try:
            import faiss  # noqa: F401
            _FAISS_AVAILABLE = True
            logger.info("FAISS available — will use IndexFlatIP for galleries >= %d", settings.faiss_threshold)
        except ImportError:
            _FAISS_AVAILABLE = False
            logger.warning("faiss-cpu not installed — using numpy matmul for all gallery sizes")
    return _FAISS_AVAILABLE


@dataclass
class PersonMeta:
    name: str
    welcome_message: str | None = None


@dataclass
class SearchResult:
    person_id: str
    label: str
    score: float    # cosine similarity [0, 1]
    index: int      # row index in the embedding matrix
    welcome_message: str | None = None


class EmbeddingStore:
    """In-process face gallery.  Qdrant is the source of truth — this is a pure RAM index.

    Populated at startup via bulk_add() from qdrant_loader.  No disk I/O.

    Search uses numpy matmul (O(N×512)) for N < faiss_threshold,
    or FAISS IndexFlatIP for larger galleries.  Both are exact cosine similarity
    because all vectors are L2-normalised (dot product == cosine sim).

    Thread-safe: all mutation and search acquire self._lock.
    """

    def __init__(self) -> None:
        self.matrix: np.ndarray = np.empty((0, 512), dtype=np.float32)
        self.labels: list[str] = []
        self.person_ids: list[str] = []
        self.person_meta: dict[str, PersonMeta] = {}
        self._faiss_index: Any | None = None
        self._lock = threading.Lock()

    # ── Internal ─────────────────────────────────────────────────────────────

    def _rebuild_faiss_if_needed(self) -> None:
        if len(self.matrix) < settings.faiss_threshold or not _probe_faiss():
            self._faiss_index = None
            return
        import faiss
        index = faiss.IndexFlatIP(512)
        index.add(np.ascontiguousarray(self.matrix, dtype=np.float32))
        self._faiss_index = index
        logger.info("EmbeddingStore: FAISS IndexFlatIP built with %d vectors", len(self.matrix))

    # ── Bulk load (called by qdrant_loader) ───────────────────────────────────

    def set_person_meta(self, meta: dict[str, PersonMeta]) -> None:
        """Replace in-memory person metadata (names + welcome messages)."""
        with self._lock:
            self.person_meta = dict(meta)

    def bulk_add(self, entries: list[tuple[str, str, "np.ndarray"]]) -> int:
        """Add many embeddings at once — single vstack + one FAISS rebuild.

        entries: list of (person_id, label, embedding) tuples.
        Returns the count actually added.
        """
        if not entries:
            return 0

        new_embs: list[np.ndarray] = []
        new_labels: list[str] = []
        new_pids: list[str] = []

        for person_id, label, embedding in entries:
            e = np.array(embedding, dtype=np.float32).ravel()
            norm = float(np.linalg.norm(e))
            if norm > 0:
                e = e / norm
            new_embs.append(e)
            new_labels.append(label)
            new_pids.append(person_id)

        new_matrix = np.array(new_embs, dtype=np.float32)

        with self._lock:
            if len(self.matrix) == 0:
                self.matrix = new_matrix
            else:
                self.matrix = np.vstack([self.matrix, new_matrix])
            self.labels.extend(new_labels)
            self.person_ids.extend(new_pids)
            self._rebuild_faiss_if_needed()

        return len(entries)

    def clear(self) -> None:
        """Reset the store to empty."""
        with self._lock:
            self.matrix = np.empty((0, 512), dtype=np.float32)
            self.labels = []
            self.person_ids = []
            self.person_meta = {}
            self._faiss_index = None
            logger.debug("EmbeddingStore: cleared")

    # ── Search ───────────────────────────────────────────────────────────────

    def search(
        self,
        query: np.ndarray,
        threshold: float | None = None,
    ) -> SearchResult | None:
        thr = threshold if threshold is not None else settings.recognition_threshold
        with self._lock:
            n = len(self.matrix)
            if n == 0:
                return None

            q = np.array(query, dtype=np.float32).ravel()
            norm = float(np.linalg.norm(q))
            if norm > 0:
                q = q / norm

            if self._faiss_index is not None:
                scores, indices = self._faiss_index.search(q.reshape(1, -1), k=1)
                best_score = float(scores[0][0])
                best_idx = int(indices[0][0])
            else:
                raw_scores = self.matrix @ q
                best_idx = int(np.argmax(raw_scores))
                best_score = float(raw_scores[best_idx])

            if best_score < thr:
                return None

            pid = self.person_ids[best_idx]
            meta = self.person_meta.get(pid)
            return SearchResult(
                person_id=pid,
                label=self.labels[best_idx],
                score=best_score,
                index=best_idx,
                welcome_message=meta.welcome_message if meta else None,
            )

    # ── In-session mutation (enroll route) ───────────────────────────────────

    def add(self, person_id: str, label: str, embedding: np.ndarray) -> None:
        """Add a single embedding (in-memory only, not persisted to Qdrant)."""
        e = np.array(embedding, dtype=np.float32).ravel()
        norm = float(np.linalg.norm(e))
        if norm > 0:
            e = e / norm

        with self._lock:
            if len(self.matrix) == 0:
                self.matrix = e.reshape(1, -1).copy()
            else:
                self.matrix = np.vstack([self.matrix, e.reshape(1, -1)])
            self.labels.append(label)
            self.person_ids.append(person_id)
            self._rebuild_faiss_if_needed()

    def remove(self, person_id: str) -> int:
        """Remove all embeddings for a person_id (in-memory only)."""
        with self._lock:
            if len(self.matrix) == 0:
                return 0
            mask = np.array([pid != person_id for pid in self.person_ids])
            removed = int((~mask).sum())
            if removed == 0:
                return 0
            self.matrix = self.matrix[mask]
            self.labels = [l for l, m in zip(self.labels, mask) if m]
            self.person_ids = [p for p, m in zip(self.person_ids, mask) if m]
            self._rebuild_faiss_if_needed()
            return removed

    # ── Queries ──────────────────────────────────────────────────────────────

    def embedding_count(self) -> int:
        return len(self.matrix)

    def persons(self) -> list[dict]:
        with self._lock:
            seen: dict[str, dict] = {}
            for pid, label in zip(self.person_ids, self.labels):
                if pid in seen:
                    seen[pid]["embedding_count"] += 1
                else:
                    seen[pid] = {"person_id": pid, "name": label, "embedding_count": 1}
            return list(seen.values())
