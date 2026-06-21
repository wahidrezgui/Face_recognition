import json
import logging
import sqlite3
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class LocalEventBuffer:
    """SQLite-backed event queue — activated when central server is unreachable."""

    def __init__(self, db_path: str) -> None:
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_db()

    def _init_db(self) -> None:
        with self._lock:
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS buffered_events ("
                "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                "  gate_id TEXT NOT NULL,"
                "  payload TEXT NOT NULL,"
                "  created_at REAL NOT NULL"
                ")"
            )
            self._conn.commit()
            logger.info("Local event buffer initialised")

    def enqueue(self, gate_id: str, payload: dict[str, Any]) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO buffered_events (gate_id, payload, created_at) VALUES (?, ?, ?)",
                (gate_id, json.dumps(payload), time.time()),
            )
            self._conn.commit()

    def dequeue_batch(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id, gate_id, payload FROM buffered_events ORDER BY id ASC LIMIT ?",
                (limit,),
            ).fetchall()
            if not rows:
                return []
            ids = [r[0] for r in rows]
            self._conn.execute(
                f"DELETE FROM buffered_events WHERE id IN ({','.join('?' for _ in ids)})",
                ids,
            )
            self._conn.commit()
            return [
                {"gate_id": r[1], "payload": json.loads(r[2])}
                for r in rows
            ]

    def pending_count(self) -> int:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) FROM buffered_events").fetchone()
            return row[0] if row else 0
