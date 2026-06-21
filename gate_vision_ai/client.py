import logging
import time
import asyncio
import httpx
import numpy as np
from datetime import datetime, timezone
from .config import settings
from .local_buffer import LocalEventBuffer

logger = logging.getLogger(__name__)


class CircuitBreaker:
    def __init__(self, threshold: int = 5, reset_timeout: float = 30.0):
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "CLOSED"
        self.open_count = 0

    def allow_request(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if time.time() - self.last_failure_time >= self.reset_timeout:
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker: OPEN -> HALF_OPEN")
                return True
            return False
        return True

    def on_success(self):
        if self.state == "HALF_OPEN":
            logger.info("Circuit breaker: HALF_OPEN -> CLOSED")
        self.failure_count = 0
        self.state = "CLOSED"

    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.threshold:
            self.state = "OPEN"
            self.open_count += 1
            logger.warning("Circuit breaker: CLOSED -> OPEN (%d consecutive failures, total opens: %d)", self.failure_count, self.open_count)

    def record(self, stats: dict, key: str):
        stats[key] = {
            "state": self.state,
            "failure_count": self.failure_count,
            "open_count": self.open_count,
        }


class NetBackendClient:
    def __init__(self):
        self.gate_id = settings.gate_id
        self.client = httpx.AsyncClient(
            base_url=settings.net_backend_url,
            timeout=settings.net_timeout,
            headers={"X-API-Key": settings.net_api_key} if settings.net_api_key else {},
        )
        self.circuit_breaker = CircuitBreaker(
            threshold=settings.net_circuit_threshold,
            reset_timeout=settings.net_circuit_reset_timeout,
        )
        self._local_buffer = LocalEventBuffer(settings.local_buffer_path)
        logger.info("Local event buffer initialised at %s", settings.local_buffer_path)

    async def identify(self, embedding: np.ndarray, frame_quality: float, captured_at: str, face_crop_b64: str | None = None, track_id: int = 0, age: int | None = None, gender: str | None = None, emotion: str | None = None) -> dict | None:
        if not self.circuit_breaker.allow_request():
            logger.warning("Circuit breaker OPEN — buffering identify request locally")
            self._buffer_identify(embedding, frame_quality, captured_at, face_crop_b64, track_id, age, gender, emotion)
            return {"circuit_open": True}

        body = {
            "gate_id": self.gate_id,
            "embedding": embedding.tolist(),
            "frame_quality": frame_quality,
            "captured_at": captured_at,
            "face_crop": face_crop_b64,
            "track_id": track_id,
            "age": int(age) if age is not None else None,
            "gender": gender,
            "emotion": emotion,
        }
        try:
            resp = await self.client.post(settings.net_identify_path, json=body)
            resp.raise_for_status()
            self.circuit_breaker.on_success()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                self.circuit_breaker.on_success()
                return None
            self.circuit_breaker.on_failure()
            logger.error("Identify request failed (%d): %s — buffering locally", e.response.status_code, e)
            self._buffer_identify(embedding, frame_quality, captured_at, face_crop_b64, track_id, age, gender, emotion)
            return None
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            self.circuit_breaker.on_failure()
            logger.error("Backend unreachable (%s) at %s — buffering locally",
                         repr(e), settings.net_backend_url)
            self._buffer_identify(embedding, frame_quality, captured_at, face_crop_b64, track_id, age, gender, emotion)
            return {"backend_down": True}
        except Exception as e:
            self.circuit_breaker.on_failure()
            logger.error("Identify request error: %s — buffering locally", e)
            self._buffer_identify(embedding, frame_quality, captured_at, face_crop_b64, track_id, age, gender, emotion)
            return None

    def _buffer_identify(self, embedding: np.ndarray, frame_quality: float, captured_at: str, face_crop_b64: str | None = None, track_id: int = 0, age: int | None = None, gender: str | None = None, emotion: str | None = None) -> None:
        payload = {
            "gate_id": self.gate_id,
            "embedding": embedding.tolist(),
            "frame_quality": frame_quality,
            "captured_at": captured_at,
            "face_crop": face_crop_b64,
            "track_id": track_id,
            "age": int(age) if age is not None else None,
            "gender": gender,
            "emotion": emotion,
        }
        self._local_buffer.enqueue(self.gate_id, payload)
        logger.info("Buffered identify event for gate=%s (pending=%d)", self.gate_id, self._local_buffer.pending_count())

    async def drain_local_buffer(self) -> int:
        drained = 0
        while True:
            batch = self._local_buffer.dequeue_batch(8)
            if not batch:
                break
            for item in batch:
                try:
                    body = item["payload"]
                    resp = await self.client.post(
                        settings.net_identify_path + "?replayed=true",
                        json=body,
                    )
                    resp.raise_for_status()
                    drained += 1
                    # Avoid replay bursts that can trigger backend rate limiting.
                    await asyncio.sleep(0.05)
                except httpx.HTTPStatusError as e:
                    status = e.response.status_code
                    logger.error("Failed to replay buffered event (%d): %s — re-enqueueing", status, e)
                    self._local_buffer.enqueue(item["gate_id"], item["payload"])
                    if status in (429, 503):
                        # Back off quickly on overload and stop this drain pass.
                        await asyncio.sleep(1.0)
                    return drained
                except Exception as e:
                    logger.error("Failed to replay buffered event: %s — re-enqueueing", e)
                    self._local_buffer.enqueue(item["gate_id"], item["payload"])
                    return drained
        if drained > 0:
            logger.info("Drained %d buffered events from local buffer", drained)
        return drained

    async def enroll(self, person_id: str, embeddings: list[np.ndarray],
                     face_images: list[str] | None = None,
                     poses: list[str] | None = None,
                     replace: bool = False) -> dict | None:
        path = settings.net_enroll_path.format(person_id=person_id)
        body: dict = {
            "embeddings": [e.tolist() for e in embeddings],
        }
        if face_images:
            body["faceImages"] = face_images
        if poses:
            body["poses"] = poses
        if replace:
            body["replace"] = True
        try:
            resp = await self.client.post(path, json=body)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("Enroll request failed: %s", e)
            return None

    async def close(self):
        await self.client.aclose()
