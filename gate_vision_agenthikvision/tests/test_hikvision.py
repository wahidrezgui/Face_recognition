"""Tests for HikvisionEventListener (TDD — written before implementation)."""
import time
import unittest
from unittest.mock import MagicMock, patch


class TestHikvisionEventListenerUnit(unittest.TestCase):
    """Unit tests that do not start the background thread."""

    def _make_listener(self, event_types="VMD,fielddetection", ttl_ms=5000, detection_target=""):
        from gate_vision_ai.hikvision import HikvisionEventListener
        # Patch _start_thread so no background thread is launched in unit tests.
        with patch.object(HikvisionEventListener, "_start_thread"):
            listener = HikvisionEventListener(
                base_url="http://192.168.1.64",
                user="admin",
                password="secret",
                event_types=event_types,
                ttl_ms=ttl_ms,
                detection_target=detection_target,
            )
        return listener

    # ── is_active ────────────────────────────────────────────────────────────

    def test_is_active_false_on_init(self):
        listener = self._make_listener()
        self.assertFalse(listener.is_active())

    def test_is_active_true_after_recent_event(self):
        listener = self._make_listener(ttl_ms=5000)
        listener._last_event_time = time.time()
        self.assertTrue(listener.is_active())

    def test_is_active_false_after_ttl_expired(self):
        listener = self._make_listener(ttl_ms=100)
        listener._last_event_time = time.time() - 1.0  # 1s ago, TTL=0.1s
        self.assertFalse(listener.is_active())

    # ── _handle_xml: accepted events ────────────────────────────────────────

    def test_handle_xml_vmd_active_sets_timestamp(self):
        listener = self._make_listener(event_types="VMD")
        before = time.time()
        listener._handle_xml(_make_event_xml("VMD", "active"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_handle_xml_fielddetection_active_sets_timestamp(self):
        listener = self._make_listener(event_types="VMD,fielddetection")
        before = time.time()
        listener._handle_xml(_make_event_xml("fielddetection", "active"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_handle_xml_empty_event_types_accepts_all(self):
        """event_types='' means accept every event type."""
        listener = self._make_listener(event_types="")
        before = time.time()
        listener._handle_xml(_make_event_xml("shelterdetection", "active"))
        self.assertGreaterEqual(listener._last_event_time, before)

    # ── _handle_xml: ignored events ─────────────────────────────────────────

    def test_handle_xml_inactive_state_does_not_set_timestamp(self):
        listener = self._make_listener(event_types="VMD")
        listener._last_event_time = 0.0
        listener._handle_xml(_make_event_xml("VMD", "inactive"))
        self.assertEqual(listener._last_event_time, 0.0)

    def test_handle_xml_filtered_type_does_not_set_timestamp(self):
        """Event type not in the filter should be ignored."""
        listener = self._make_listener(event_types="VMD")
        listener._last_event_time = 0.0
        listener._handle_xml(_make_event_xml("shelterdetection", "active"))
        self.assertEqual(listener._last_event_time, 0.0)

    def test_handle_xml_malformed_does_not_raise(self):
        listener = self._make_listener()
        listener._last_event_time = 0.0
        listener._handle_xml(b"<broken xml")
        self.assertEqual(listener._last_event_time, 0.0)

    # ── _handle_xml: namespace variants ─────────────────────────────────────

    def test_handle_xml_with_namespace(self):
        listener = self._make_listener(event_types="VMD")
        before = time.time()
        listener._handle_xml(_make_event_xml_with_ns("VMD", "active"))
        self.assertGreaterEqual(listener._last_event_time, before)

    # ── _extract_xml_chunks ──────────────────────────────────────────────────

    def test_extract_xml_chunks_single(self):
        from gate_vision_ai.hikvision import _extract_xml_chunks
        xml = _make_event_xml("VMD", "active")
        chunks, remainder = _extract_xml_chunks(xml)
        self.assertEqual(len(chunks), 1)
        self.assertIn(b"VMD", chunks[0])

    def test_extract_xml_chunks_multiple(self):
        from gate_vision_ai.hikvision import _extract_xml_chunks
        two = _make_event_xml("VMD", "active") + _make_event_xml("fielddetection", "active")
        chunks, remainder = _extract_xml_chunks(two)
        self.assertEqual(len(chunks), 2)

    def test_extract_xml_chunks_partial_returns_remainder(self):
        from gate_vision_ai.hikvision import _extract_xml_chunks
        partial = _make_event_xml("VMD", "active") + b"<?xml partial"
        chunks, remainder = _extract_xml_chunks(partial)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(remainder, b"<?xml partial")

    def test_extract_xml_chunks_empty(self):
        from gate_vision_ai.hikvision import _extract_xml_chunks
        chunks, remainder = _extract_xml_chunks(b"")
        self.assertEqual(chunks, [])
        self.assertEqual(remainder, b"")

    # ── detection_target filter ─────────────────────────────────────────────

    def test_detection_target_human_flat_field_triggers(self):
        """Flat <detectionTarget>human</detectionTarget> with filter=human → triggers."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="human")
        before = time.time()
        listener._handle_xml(_make_region_entrance_xml("active", detection_target="human"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_detection_target_human_nested_type_triggers(self):
        """Nested <RegionEntrance><targetType>human</targetType> with filter=human → triggers."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="human")
        before = time.time()
        listener._handle_xml(_make_region_entrance_xml("active", nested_target="human"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_detection_target_vehicle_not_human_does_not_trigger(self):
        """<detectionTarget>vehicle</detectionTarget> with filter=human → ignored."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="human")
        listener._last_event_time = 0.0
        listener._handle_xml(_make_region_entrance_xml("active", detection_target="vehicle"))
        self.assertEqual(listener._last_event_time, 0.0)

    def test_detection_target_absent_allows_through(self):
        """No target field in XML with filter=human → allowed (older firmware safe default)."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="human")
        before = time.time()
        listener._handle_xml(_make_event_xml("regionEntrance", "active"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_detection_target_empty_no_filter(self):
        """detection_target='' → no filtering, vehicle target still triggers."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="")
        before = time.time()
        listener._handle_xml(_make_region_entrance_xml("active", detection_target="vehicle"))
        self.assertGreaterEqual(listener._last_event_time, before)

    def test_detection_target_case_insensitive(self):
        """Filter matching is case-insensitive: 'Human' == 'human'."""
        listener = self._make_listener(event_types="regionEntrance", detection_target="human")
        before = time.time()
        listener._handle_xml(_make_region_entrance_xml("active", detection_target="Human"))
        self.assertGreaterEqual(listener._last_event_time, before)

    # ── _get_detection_target helper ────────────────────────────────────────

    def test_get_detection_target_flat(self):
        from gate_vision_ai.hikvision import _get_detection_target
        import xml.etree.ElementTree as ET
        root = ET.fromstring(_make_region_entrance_xml("active", detection_target="human"))
        self.assertEqual(_get_detection_target(root), "human")

    def test_get_detection_target_nested(self):
        from gate_vision_ai.hikvision import _get_detection_target
        import xml.etree.ElementTree as ET
        root = ET.fromstring(_make_region_entrance_xml("active", nested_target="human"))
        self.assertEqual(_get_detection_target(root), "human")

    def test_get_detection_target_absent_returns_empty(self):
        from gate_vision_ai.hikvision import _get_detection_target
        import xml.etree.ElementTree as ET
        root = ET.fromstring(_make_event_xml("VMD", "active"))
        self.assertEqual(_get_detection_target(root), "")

    # ── is_connected / stop ──────────────────────────────────────────────────

    def test_is_connected_false_on_init(self):
        listener = self._make_listener()
        self.assertFalse(listener.is_connected())

    def test_stop_sets_stopped_flag(self):
        listener = self._make_listener()
        listener.stop()
        self.assertTrue(listener._stopped)

    # ── URL construction ─────────────────────────────────────────────────────

    def test_alert_stream_url_trailing_slash(self):
        from gate_vision_ai.hikvision import HikvisionEventListener
        with patch.object(HikvisionEventListener, "_start_thread"):
            listener = HikvisionEventListener(
                base_url="http://192.168.1.64/",
                user="admin",
                password="s",
                event_types="",
                ttl_ms=5000,
                detection_target="",
            )
        self.assertEqual(listener._url, "http://192.168.1.64/ISAPI/Event/notification/alertStream")


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_event_xml(event_type: str, event_state: str) -> bytes:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<EventNotificationAlert>"
        f"<eventType>{event_type}</eventType>"
        f"<eventState>{event_state}</eventState>"
        f"<eventDescription>Test</eventDescription>"
        f"</EventNotificationAlert>"
    ).encode()


def _make_region_entrance_xml(
    event_state: str,
    detection_target: str = "",
    nested_target: str = "",
) -> bytes:
    """Build a regionEntrance XML with optional flat or nested target type."""
    ns = "http://www.hikvision.com/ver20/XMLSchema"
    flat = f"<detectionTarget>{detection_target}</detectionTarget>" if detection_target else ""
    nested = (
        f"<RegionEntrance><targetType>{nested_target}</targetType></RegionEntrance>"
        if nested_target
        else ""
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<EventNotificationAlert version="2.0" xmlns="{ns}">'
        f"<eventType>regionEntrance</eventType>"
        f"<eventState>{event_state}</eventState>"
        f"<eventDescription>Region Entrance alarm</eventDescription>"
        f"{flat}{nested}"
        f"</EventNotificationAlert>"
    ).encode()


def _make_event_xml_with_ns(event_type: str, event_state: str) -> bytes:
    ns = "http://www.hikvision.com/ver20/XMLSchema"
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f'<EventNotificationAlert version="2.0" xmlns="{ns}">'
        f"<eventType>{event_type}</eventType>"
        f"<eventState>{event_state}</eventState>"
        f"<eventDescription>Test</eventDescription>"
        f"</EventNotificationAlert>"
    ).encode()


if __name__ == "__main__":
    unittest.main()
