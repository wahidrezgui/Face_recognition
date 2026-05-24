import json
import logging
import sqlite3
import threading
from typing import Any

logger = logging.getLogger(__name__)


class LocalEventBuffer:
    """SQLite-backed event queue — activated when central server is unreachable."""

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        with self._lock:
            conn = sqlite3.connect(self._db_path)
            try:
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS buffered_events ("
                    "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "  gate_id TEXT NOT NULL,"
                    "  payload TEXT NOT NULL,"
                    "  created_at REAL NOT NULL"
                    ")"
                )
                conn.commit()
            finally:
                conn.close()
            logger.info("Local event buffer initialised at %s", self._db_path)

    def enqueue(self, gate_id: str, payload: dict[str, Any]) -> None:
        with self._lock:
            conn = sqlite3.connect(self._db_path)
            try:
                conn.execute(
                    "INSERT INTO buffered_events (gate_id, payload, created_at) VALUES (?, ?, ?)",
                    (gate_id, json.dumps(payload), __import__("time").time()),
                )
                conn.commit()
            finally:
                conn.close()

    def dequeue_batch(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._lock:
            conn = sqlite3.connect(self._db_path)
            try:
                rows = conn.execute(
                    "SELECT id, gate_id, payload FROM buffered_events ORDER BY id ASC LIMIT ?",
                    (limit,),
                ).fetchall()
                if not rows:
                    return []
                ids = [r[0] for r in rows]
                conn.execute(
                    f"DELETE FROM buffered_events WHERE id IN ({','.join('?' for _ in ids)})",
                    ids,
                )
                conn.commit()
                return [
                    {"gate_id": r[1], "payload": json.loads(r[2])}
                    for r in rows
                ]
            finally:
                conn.close()

    def pending_count(self) -> int:
        with self._lock:
            conn = sqlite3.connect(self._db_path)
            try:
                row = conn.execute("SELECT COUNT(*) FROM buffered_events").fetchone()
                return row[0] if row else 0
            finally:
                conn.close()
