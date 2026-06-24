"""Load all face embeddings from Qdrant into the local EmbeddingStore at startup.

Qdrant is the source of truth for enrolled faces.  This module:
  1. Fetches all active persons from the .NET API (name + welcome message)
  2. Scrolls the entire face_embeddings Qdrant collection (all vectors + payloads)
  3. Populates the EmbeddingStore via bulk_add() — single matrix vstack, one FAISS rebuild

Called once from main.py lifespan after the EmbeddingStore is created.
"""

from __future__ import annotations

import logging

import httpx
import numpy as np

from .config import settings
from .recognizer import EmbeddingStore, PersonMeta

logger = logging.getLogger("gate_vision_ai_v1")


async def _fetch_all_persons(backend_url: str, api_key: str) -> dict[str, PersonMeta]:
    """Fetch every active person from the .NET API."""
    headers: dict[str, str] = {}
    if api_key:
        headers["X-API-Key"] = api_key

    persons: dict[str, PersonMeta] = {}
    page = 1
    page_size = 200

    async with httpx.AsyncClient(timeout=15.0) as client:
        while True:
            try:
                resp = await client.get(
                    f"{backend_url.rstrip('/')}/api/v1/persons",
                    params={"page": page, "pageSize": page_size},
                    headers=headers,
                )
                if resp.status_code != 200:
                    logger.warning(
                        "qdrant_loader: persons page %d HTTP %d — skipping name lookup",
                        page, resp.status_code,
                    )
                    break

                body = resp.json()
                items = body.get("items") or body.get("Items") or []
                for item in items:
                    status = (
                        item.get("enrollmentStatus")
                        or item.get("EnrollmentStatus")
                        or "Active"
                    )
                    if str(status).lower() != "active":
                        continue

                    pid = str(item.get("Id") or item.get("id") or "").strip()
                    name = (item.get("FullName") or item.get("fullName") or "").strip()
                    welcome = item.get("welcomeMessage") or item.get("WelcomeMessage")
                    welcome_msg = welcome.strip() if isinstance(welcome, str) and welcome.strip() else None
                    if pid and name:
                        persons[pid] = PersonMeta(name=name, welcome_message=welcome_msg)

                total = body.get("total") or body.get("Total") or 0
                total_pages = body.get("totalPages") or body.get("TotalPages") or (
                    (total + page_size - 1) // page_size if total else 1
                )
                if page >= total_pages or not items:
                    break
                page += 1

            except Exception as exc:
                logger.warning("qdrant_loader: persons fetch failed: %s", exc)
                break

    return persons


async def load_embeddings_from_qdrant(store: EmbeddingStore) -> int:
    """
    Scroll the entire Qdrant face_embeddings collection, look up person names,
    and populate the EmbeddingStore.  Replaces existing store contents on success.
    Returns the number of embeddings loaded (0 = Qdrant unreachable or empty).
    """
    qdrant_url = settings.qdrant_url.rstrip("/")
    collection = settings.qdrant_collection
    backend_url = settings.net_backend_url
    api_key = settings.net_api_key

    logger.info(
        "qdrant_loader: START — connecting to %s  collection=%s",
        qdrant_url, collection,
    )

    # ── Step 1: verify collection exists ──────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{qdrant_url}/collections/{collection}")

        if resp.status_code == 404:
            logger.warning(
                "qdrant_loader: collection '%s' not found — no embeddings loaded.  "
                "Enroll faces via the .NET API first.",
                collection,
            )
            return 0
        if resp.status_code != 200:
            logger.error(
                "qdrant_loader: collection check HTTP %d — Qdrant may be starting up?",
                resp.status_code,
            )
            return 0

        info = resp.json().get("result", {})
        vectors_count = (
            info.get("vectors_count")
            or info.get("points_count")
            or 0
        )
        logger.info(
            "qdrant_loader: collection '%s' has ~%d vectors",
            collection, vectors_count,
        )

    except Exception as exc:
        logger.error(
            "qdrant_loader: cannot reach Qdrant at %s: %s  "
            "(is Docker running? docker ps | grep qdrant)",
            qdrant_url, exc,
        )
        return 0

    # ── Step 2: fetch active person metadata ───────────────────────────────────
    persons_map: dict[str, PersonMeta] = {}
    if backend_url:
        try:
            persons_map = await _fetch_all_persons(backend_url, api_key)
            with_welcome = sum(1 for p in persons_map.values() if p.welcome_message)
            logger.info(
                "qdrant_loader: fetched %d active persons (%d with welcome) from %s",
                len(persons_map), with_welcome, backend_url,
            )
        except Exception as exc:
            logger.warning(
                "qdrant_loader: could not fetch persons (%s) — "
                "will label faces by UUID prefix",
                exc,
            )
    else:
        logger.info(
            "qdrant_loader: GV1_NET_BACKEND_URL not set — faces will use UUID labels"
        )

    store.set_person_meta(persons_map)

    # ── Step 3: scroll all points ──────────────────────────────────────────────
    entries: list[tuple[str, str, np.ndarray]] = []
    offset: str | None = None
    batch_size = 100
    batch_num = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            body: dict = {
                "with_payload": True,
                "with_vector": True,
                "limit": batch_size,
            }
            if offset is not None:
                body["offset"] = offset

            try:
                resp = await client.post(
                    f"{qdrant_url}/collections/{collection}/points/scroll",
                    json=body,
                )
                if resp.status_code != 200:
                    logger.error(
                        "qdrant_loader: scroll HTTP %d: %s",
                        resp.status_code, resp.text[:300],
                    )
                    return 0

                result = resp.json().get("result", {})
                points = result.get("points", [])
                batch_num += 1
                skipped = 0

                for point in points:
                    vector = point.get("vector")
                    payload = point.get("payload") or {}
                    person_id = str(payload.get("person_id") or "").strip()

                    if not vector or not person_id:
                        skipped += 1
                        continue

                    if persons_map and person_id not in persons_map:
                        skipped += 1
                        continue

                    meta = persons_map.get(person_id)
                    name = meta.name if meta else person_id[:8]
                    emb = np.array(vector, dtype=np.float32)
                    entries.append((person_id, name, emb))

                if batch_num <= 3 or batch_num % 10 == 0:
                    logger.debug(
                        "qdrant_loader: batch %d → %d points (%d skipped, %d total so far)",
                        batch_num, len(points), skipped, len(entries),
                    )

                next_offset = result.get("next_page_offset")
                if next_offset is None or len(points) == 0:
                    break
                offset = next_offset

            except Exception as exc:
                logger.error(
                    "qdrant_loader: scroll error on batch %d: %s",
                    batch_num, exc, exc_info=True,
                )
                return 0

    # ── Step 4: populate store ─────────────────────────────────────────────────
    if not entries:
        logger.warning(
            "qdrant_loader: no valid embeddings found in '%s'.  "
            "Detection will run but all faces show UNKNOWN until someone is enrolled.",
            collection,
        )
        return 0

    count = store.bulk_add(entries)
    unique_persons = len({pid for pid, _, _ in entries})

    logger.info(
        "qdrant_loader: DONE — loaded %d embeddings for %d unique persons  "
        "(store now has %d embeddings)",
        count, unique_persons, store.embedding_count(),
    )
    return count
