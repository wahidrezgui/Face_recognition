"""UTC wall-clock helpers for API payloads."""

from __future__ import annotations

import datetime


def utc_now_iso_ms() -> str:
    """Return current UTC time as ISO-8601 with millisecond precision and Z suffix."""
    return (
        datetime.datetime.now(datetime.timezone.utc)
        .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
        + "Z"
    )
