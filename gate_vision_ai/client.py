import logging
import time
import httpx
import numpy as np
from datetime import datetime, timezone
from .config import settings

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
        self.client = httpx.AsyncClient(
            base_url=settings.net_backend_url,
            timeout=settings.net_timeout,
            headers={"X-API-Key": settings.net_api_key} if settings.net_api_key else {},
        )
        self.circuit_breaker = CircuitBreaker(
            threshold=settings.net_circuit_threshold,
            reset_timeout=settings.net_circuit_reset_timeout,
        )

    async def identify(self, embedding: np.ndarray, frame_quality: float, captured_at: str, direction: str = "entry", face_crop_b64: str | None = None, track_id: int = 0) -> dict | None:
        if not self.circuit_breaker.allow_request():
            logger.warning("Circuit breaker OPEN — skipping identify request")
            return {"circuit_open": True}

        body = {
            "embedding": embedding.tolist(),
            "frame_quality": frame_quality,
            "captured_at": captured_at,
            "direction": direction,
            "face_crop": face_crop_b64,
            "track_id": track_id,
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
            logger.error("Identify request failed (%d): %s", e.response.status_code, e)
            return None
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            self.circuit_breaker.on_failure()
            logger.error("Backend unreachable: %s", e)
            return {"backend_down": True}
        except Exception as e:
            self.circuit_breaker.on_failure()
            logger.error("Identify request error: %s", e)
            return None

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
