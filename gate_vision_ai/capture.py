import os
import time
import logging
import threading
import cv2
import numpy as np
from .config import settings

logger = logging.getLogger(__name__)

_BASE = os.path.dirname(os.path.abspath(__file__))

# FFmpeg options injected via env var for RTSP/RTMP streams:
#   rtsp_transport=tcp  — avoids UDP packet loss/reordering on LAN
#   fflags=nobuffer     — disables FFmpeg's receive jitter buffer
#   flags=low_delay     — enables decoder low-delay mode
#   analyzeduration=0   — skip stream analysis phase (faster open)
#   probesize=32768     — minimal probe read to start decoding sooner
_FFMPEG_LOW_LATENCY_OPTIONS = (
    "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
    "|analyzeduration;0|probesize;32768"
)


class CameraCapture:
    def __init__(self, source: str | None = None):
        effective = source if source is not None else settings.camera_source
        self._raw_source = effective
        self._source, self._is_camera_index = self._resolve_source(effective)
        self._is_network_stream = isinstance(self._source, str) and self._source.startswith(
            ("rtsp://", "rtmp://")
        )
        self._backoff = 1
        self._stopped = False
        self.cap = self._open()

        # Background grab thread — runs at full camera speed, keeping only the latest decoded frame.
        # Without this, RTSP buffer accumulates while the main loop is busy (JPEG encoding, detection),
        # and each cap.read() returns an increasingly stale frame. The grab thread drains that buffer
        # continuously so read_frame() always returns the newest frame.
        self._latest_frame: np.ndarray | None = None
        self._frame_lock = threading.Lock()
        self._frame_ready = threading.Event()
        self._grab_thread = threading.Thread(
            target=self._grab_loop, daemon=True, name="cam-grab"
        )
        self._grab_thread.start()

    @staticmethod
    def _resolve_source(source: str):
        maybe_path = os.path.normpath(os.path.join(_BASE, source.lstrip("./\\")))
        if os.path.isfile(maybe_path):
            return maybe_path, False
        if source.startswith(("http://", "https://", "rtsp://", "rtmp://")):
            return source, False
        if source.isdigit():
            return int(source), True
        return source, False

    @staticmethod
    def _open_dshow(source_idx: int, timeout: float = 8.0) -> "cv2.VideoCapture | None":
        """Open a camera index via DSHOW in a background thread with a timeout.

        DSHOW can hang indefinitely on Windows when a USB webcam is in a bad state.
        Returns the VideoCapture on success, or None if it hangs / fails to open.
        """
        result: list[cv2.VideoCapture | None] = [None]

        def _do() -> None:
            result[0] = cv2.VideoCapture(source_idx, cv2.CAP_DSHOW)

        t = threading.Thread(target=_do, daemon=True)
        t.start()
        t.join(timeout=timeout)
        if t.is_alive():
            logger.warning("DSHOW open timed out for source %s — falling back to default backend", source_idx)
            return None
        return result[0]

    def _open(self) -> cv2.VideoCapture:
        if self._is_camera_index:
            # Windows MSMF has issues with many USB webcams; DSHOW is more reliable,
            # but if DSHOW fails to read frames, fall back to default backend.
            # Use a timeout wrapper to avoid the thread hanging forever on DSHOW init.
            cap = self._open_dshow(self._source)
            if cap is not None and cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    logger.info("Camera opened: %s -> %s (backend=DSHOW)", self._raw_source, self._source)
                    self._backoff = 1
                    return cap
                logger.warning("DSHOW opened camera %s but read failed, falling back to default backend", self._source)
                cap.release()
            cap = cv2.VideoCapture(self._source)
        elif self._is_network_stream:
            # Inject FFmpeg low-latency options via env var, scoped to this open call.
            prev = os.environ.get("OPENCV_FFMPEG_CAPTURE_OPTIONS")
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = _FFMPEG_LOW_LATENCY_OPTIONS
            cap = cv2.VideoCapture(self._source, cv2.CAP_FFMPEG)
            if prev is None:
                os.environ.pop("OPENCV_FFMPEG_CAPTURE_OPTIONS", None)
            else:
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = prev
        else:
            cap = cv2.VideoCapture(self._source)

        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera source: {self._raw_source}")

        # Keep OpenCV's internal frame queue at 1 (belt-and-suspenders alongside the grab thread).
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        backend = "FFMPEG(low-latency)" if self._is_network_stream else (
            "DSHOW" if self._is_camera_index else "default"
        )
        logger.info("Camera opened: %s -> %s (backend=%s)", self._raw_source, self._source, backend)
        self._backoff = 1
        return cap

    def _grab_loop(self) -> None:
        """Drain the capture buffer at full camera rate, keeping only the latest decoded frame.
        Runs as a daemon thread — all cap.read() calls happen here to avoid concurrent access."""
        while not self._stopped:
            try:
                ret, frame = self.cap.read()
                if self._stopped:
                    break
                if not ret:
                    logger.warning("Grab loop: read failed, reconnecting in %ds...", self._backoff)
                    time.sleep(self._backoff)
                    self._backoff = min(self._backoff * 2, 30)
                    self.cap.release()
                    if self._stopped:
                        break
                    try:
                        self.cap = self._open()
                        if self._is_network_stream:
                            # Discard buffered stale frames accumulated during downtime.
                            for _ in range(4):
                                self.cap.grab()
                    except Exception:
                        logger.error("Grab loop: reconnect failed, will retry")
                    continue

                self._backoff = 1
                with self._frame_lock:
                    self._latest_frame = frame
                self._frame_ready.set()
            except Exception as e:
                # C++ exceptions from DSHOW (filter graph crash, driver error) land here.
                # The cap is dead — treat it identically to ret=False and reconnect.
                logger.warning("Grab loop: capture exception (%s), reconnecting in %ds...", e, self._backoff)
                time.sleep(self._backoff)
                self._backoff = min(self._backoff * 2, 30)
                try:
                    self.cap.release()
                except Exception:
                    pass
                if self._stopped:
                    break
                try:
                    self.cap = self._open()
                except Exception:
                    logger.error("Grab loop: reconnect failed after exception, will retry")

    def read_frame(self) -> np.ndarray | None:
        """Return the latest available frame, blocking up to 2s if none yet."""
        if self._stopped:
            return None
        if not self._frame_ready.wait(timeout=2.0):
            return None
        self._frame_ready.clear()
        with self._frame_lock:
            return self._latest_frame

    def release(self) -> None:
        self._stopped = True
        self._frame_ready.set()  # unblock any waiting read_frame()
        self._grab_thread.join(timeout=2.0)  # wait for grab loop to exit before releasing cap
        self.cap.release()
