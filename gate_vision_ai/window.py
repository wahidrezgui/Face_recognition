import asyncio
import time
from dataclasses import dataclass
from typing import Any

from .processing import process_single_face


@dataclass
class SnapshotPerson:
    track_id: int
    face: dict
    frame: Any        # numpy array held by reference, not copied
    confidence: float
    timestamp: str
    rank: int = 0     # assigned at finalization, 1 = highest confidence


@dataclass
class InteractionSnapshot:
    persons: list[SnapshotPerson]
    window_start: float
    window_end: float

    def __len__(self) -> int:
        return len(self.persons)


@dataclass
class IdentityResult:
    track_id: int
    rank: int
    result: dict      # raw dict from process_single_face


@dataclass
class _FaceCandidate:
    face: dict
    frame: Any
    confidence: float
    timestamp: str


class InteractionWindowManager:
    """Collects face detections over a fixed time window and emits a stable snapshot.

    Within each window, duplicate track_ids are merged (highest confidence wins).
    Ordering is locked at finalization — immutable after that.
    """

    def __init__(self, window_duration_ms: int) -> None:
        self._duration: float = window_duration_ms / 1000.0
        self._candidates: dict[int, _FaceCandidate] = {}
        self._window_start: float = 0.0

    def collect(self, track_id: int, face: dict, frame: Any, confidence: float, timestamp: str) -> None:
        if not self._candidates:
            self._window_start = time.monotonic()

        existing = self._candidates.get(track_id)
        if existing is None or confidence > existing.confidence:
            self._candidates[track_id] = _FaceCandidate(
                face=face, frame=frame, confidence=confidence, timestamp=timestamp
            )

    def is_window_open(self) -> bool:
        if not self._candidates:
            return False
        return (time.monotonic() - self._window_start) < self._duration

    def has_faces(self) -> bool:
        return len(self._candidates) > 0

    def finalize(self) -> InteractionSnapshot:
        window_end = time.monotonic()
        sorted_candidates = sorted(
            self._candidates.items(),
            key=lambda kv: kv[1].confidence,
            reverse=True,
        )
        persons = [
            SnapshotPerson(
                track_id=tid,
                face=candidate.face,
                frame=candidate.frame,
                confidence=candidate.confidence,
                timestamp=candidate.timestamp,
                rank=rank,
            )
            for rank, (tid, candidate) in enumerate(sorted_candidates, start=1)
        ]
        self._candidates.clear()
        return InteractionSnapshot(
            persons=persons,
            window_start=self._window_start,
            window_end=window_end,
        )


class IdentityScheduler:
    """Resolves identities for a finalized snapshot under a per-window request budget.

    Ordering from the snapshot is respected. Once schedule() starts, the queue
    cannot be reordered — the snapshot is frozen.
    """

    def __init__(self, max_requests: int, greeting_delay_ms: int) -> None:
        self._max_requests = max_requests
        self._delay: float = greeting_delay_ms / 1000.0

    async def schedule(
        self,
        snapshot: InteractionSnapshot,
        direction: str,
        backend,
    ) -> list[IdentityResult]:
        candidates = snapshot.persons[: self._max_requests]
        results: list[IdentityResult] = []

        for i, person in enumerate(candidates):
            result = await process_single_face(
                person.face, person.frame, person.timestamp, direction, backend,
                track_id=person.track_id,
            )
            results.append(IdentityResult(track_id=person.track_id, rank=person.rank, result=result))

            if i < len(candidates) - 1:
                await asyncio.sleep(self._delay)

        return results
