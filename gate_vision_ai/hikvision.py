import logging
import threading
import time
import xml.etree.ElementTree as ET
from collections import deque
from datetime import datetime, timezone
from urllib.request import HTTPPasswordMgrWithDefaultRealm, HTTPDigestAuthHandler, build_opener
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)

_ALERT_PATH = "/ISAPI/Event/notification/alertStream"
_HIKVISION_NS = "http://www.hikvision.com/ver20/XMLSchema"
_END_TAG = b"</EventNotificationAlert>"


def _extract_xml_chunks(buf: bytes) -> tuple[list[bytes], bytes]:
    """Extract complete EventNotificationAlert XML documents from a byte buffer.

    Returns (chunks, remainder) where remainder is any trailing incomplete data.
    """
    chunks: list[bytes] = []
    while True:
        end_idx = buf.find(_END_TAG)
        if end_idx == -1:
            break
        # Find the start of this document (<?xml or the root element opening tag)
        start_idx = buf.find(b"<?xml")
        if start_idx == -1:
            start_idx = buf.find(b"<EventNotificationAlert")
        if start_idx == -1 or start_idx > end_idx:
            # No recognisable start before the closing tag — discard up to end
            buf = buf[end_idx + len(_END_TAG):]
            continue
        chunks.append(buf[start_idx : end_idx + len(_END_TAG)])
        buf = buf[end_idx + len(_END_TAG):]
    return chunks, buf


def _get_detection_target(root: ET.Element) -> str:
    """Extract the detection target type from an EventNotificationAlert element.

    Checks both flat (<detectionTarget>) and nested (<*><targetType>) forms used
    by different Hikvision firmware versions.  Returns lowercase value or "" if absent.
    """
    ns = {"hik": _HIKVISION_NS}
    # Flat form: <detectionTarget>human</detectionTarget>
    val = (
        root.findtext("hik:detectionTarget", namespaces=ns)
        or root.findtext("detectionTarget")
    )
    if val:
        return val.strip().lower()
    # Nested form: <RegionEntrance><targetType>human</targetType></RegionEntrance>
    # Use iter() to search anywhere in the tree regardless of nesting depth.
    for elem in root.iter():
        local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if local == "targetType" and elem.text:
            return elem.text.strip().lower()
    return ""


class HikvisionEventListener:
    """Connects to a Hikvision camera's ISAPI alert stream and tracks the last event time.

    Runs a daemon thread that maintains the persistent HTTP connection.  The main
    capture loop calls ``is_active()`` to decide whether to run face detection,
    replacing the software pixel-diff motion gate when this listener is configured.
    """

    def __init__(
        self,
        base_url: str,
        user: str,
        password: str,
        event_types: str,       # comma-separated; empty = accept all
        ttl_ms: int,
        detection_target: str,  # e.g. "human"; empty = no filter
    ) -> None:
        self._url = base_url.rstrip("/") + _ALERT_PATH
        self._user = user
        self._password = password
        # Empty string means accept all; otherwise lowercase set for fast lookup
        self._event_types: set[str] = (
            set(t.strip().lower() for t in event_types.split(",") if t.strip())
            if event_types.strip()
            else set()
        )
        self._ttl_s: float = ttl_ms / 1000.0
        self._detection_target: str = detection_target.strip().lower()

        self._last_event_time: float = 0.0
        self._connected: bool = False
        self._stopped: bool = False
        # Circular buffer of recent events for the dashboard — newest first
        self._recent_events: deque = deque(maxlen=50)

        self._start_thread()

    def _start_thread(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name="hik-events")
        self._thread.start()

    # ── public API ──────────────────────────────────────────────────────────

    def is_active(self) -> bool:
        """Return True if a qualifying camera event was received within the TTL window."""
        return (time.time() - self._last_event_time) < self._ttl_s

    def is_connected(self) -> bool:
        return self._connected

    def get_recent_events(self) -> list:
        """Return recent camera events (newest first) for dashboard display."""
        return list(self._recent_events)

    def stop(self) -> None:
        self._stopped = True

    # ── background thread ───────────────────────────────────────────────────

    def _run(self) -> None:
        backoff = 2
        while not self._stopped:
            try:
                self._connected = False
                logger.info("Hikvision: connecting to %s", self._url)
                pm = HTTPPasswordMgrWithDefaultRealm()
                pm.add_password(None, self._url, self._user, self._password)
                opener = build_opener(HTTPDigestAuthHandler(pm))
                with opener.open(self._url, timeout=30) as resp:
                    self._connected = True
                    backoff = 2
                    logger.info("Hikvision: connected, streaming events")
                    self._read_stream(resp)
            except (URLError, HTTPError, OSError, TimeoutError) as e:
                self._connected = False
                logger.warning("Hikvision: connection error: %s — retry in %ds", e, backoff)
            except Exception as e:
                self._connected = False
                logger.error("Hikvision: unexpected error: %s", e, exc_info=True)
            if not self._stopped:
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

    def _read_stream(self, response) -> None:
        buf = b""
        while not self._stopped:
            chunk = response.read(4096)
            if not chunk:
                break
            buf += chunk
            chunks, buf = _extract_xml_chunks(buf)
            for xml_bytes in chunks:
                self._handle_xml(xml_bytes)

    def _handle_xml(self, xml_bytes: bytes) -> None:
        try:
            root = ET.fromstring(xml_bytes)
            ns = {"hik": _HIKVISION_NS}
            event_type = (
                root.findtext("hik:eventType", namespaces=ns)
                or root.findtext("eventType")
                or ""
            )
            event_state = (
                root.findtext("hik:eventState", namespaces=ns)
                or root.findtext("eventState")
                or ""
            )
            channel_id = (
                root.findtext("hik:channelID", namespaces=ns)
                or root.findtext("channelID")
                or root.findtext("hik:dynChannelID", namespaces=ns)
                or root.findtext("dynChannelID")
                or "1"
            )
            detection_target = _get_detection_target(root)

            # Determine whether this event qualifies to trigger detection
            qualified = True
            reason: str | None = None
            type_ok = not self._event_types or event_type.lower() in self._event_types
            state_ok = event_state.lower() == "active"
            if not type_ok:
                qualified = False
                reason = f"type '{event_type}' not in filter ({','.join(self._event_types) or 'all'})"
            elif not state_ok:
                qualified = False
                reason = f"state '{event_state}' (need 'active')"
            elif self._detection_target and detection_target and detection_target != self._detection_target:
                qualified = False
                reason = f"target '{detection_target}' (want '{self._detection_target}')"

            # Record ALL events so the dashboard can show what the camera is sending
            self._recent_events.appendleft({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "eventType": event_type,
                "eventState": event_state,
                "channelId": channel_id,
                "detectionTarget": detection_target or None,
                "qualified": qualified,
                "reason": reason,
            })

            if not qualified:
                logger.debug("Hikvision: skipped event type=%s state=%s reason=%s",
                             event_type, event_state, reason)
                return

            logger.debug("Hikvision: event type=%s state=%s channel=%s", event_type, event_state, channel_id)
            self._last_event_time = time.time()
        except ET.ParseError as e:
            logger.debug("Hikvision: XML parse error: %s", e)
