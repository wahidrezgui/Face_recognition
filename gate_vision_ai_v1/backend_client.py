"""Fire-and-forget HTTP client for POST /api/v1/identify.

Called via asyncio.create_task() so it never blocks the capture loop.
Includes a simple 5-failure circuit breaker that opens for 30 s.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

import httpx
import numpy as np

from .config import settings
from .quality import crop_face_b64

logger = logging.getLogger("gate_vision_ai_v1")


class NetBackendClient:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._failures: int = 0
        self._open_until: float = 0.0

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5.0)
        return self._client

    async def identify(
        self,
        embedding: np.ndarray,
        quality: float,
        track_id: int,
        captured_at: str,
        face_crop_b64: Optional[str] = None,
        frame: Optional[np.ndarray] = None,
        face_bbox: Optional[list] = None,
        age: Optional[float] = None,
        gender: Optional[str] = None,
        person_id: Optional[str] = None,
        person_name: Optional[str] = None,
        confidence: Optional[float] = None,
        welcome_message: Optional[str] = None,
    ) -> None:
        """POST one recognition event to .NET — non-blocking, called via create_task."""
        if time.monotonic() < self._open_until:
            return  # circuit open

        if not settings.net_backend_url:
            return  # standalone mode — no backend configured

        if face_crop_b64 is None and frame is not None and face_bbox is not None:
            face_crop_b64 = crop_face_b64(frame, face_bbox)

        body = {
            "gate_id": settings.gate_id,
            "embedding": embedding.tolist(),
            "frame_quality": round(float(quality), 4),
            "captured_at": captured_at,
            "face_crop": face_crop_b64,
            "track_id": track_id,
            "age": int(age) if age is not None else None,
            "gender": gender[0].upper() if gender else None,  # "Male" → "M"
            "emotion": None,
            "person_id": person_id,
            "person_name": person_name,
            "confidence": round(float(confidence), 4) if confidence is not None else None,
            "welcome_message": welcome_message,
        }

        headers: dict[str, str] = {}
        if settings.net_api_key:
            headers["X-API-Key"] = settings.net_api_key

        url = f"{settings.net_backend_url.rstrip('/')}/api/v1/identify"

        try:
            client = await self._get_client()
            resp = await client.post(url, json=body, headers=headers)

            if resp.status_code in (200, 201):
                self._failures = 0
                data = resp.json()
                person_name = (
                    data.get("personName")
                    or data.get("PersonName")
                    or data.get("person_name")
                    or "?"
                )
                logger.info(
                    "identify OK → %s  conf=%s  track=%d",
                    person_name,
                    data.get("confidence", "?"),
                    track_id,
                )
            else:
                self._failures += 1
                logger.warning(
                    "identify HTTP %d  track=%d  failures=%d  body=%s",
                    resp.status_code, track_id, self._failures, resp.text[:200],
                )

        except Exception as exc:
            self._failures += 1
            logger.warning(
                "identify failed  track=%d  failures=%d: %s",
                track_id, self._failures, exc,
            )

        if self._failures >= 5:
            self._open_until = time.monotonic() + 30.0
            logger.warning(
                "identify: circuit opened for 30 s after %d consecutive failures",
                self._failures,
            )

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
