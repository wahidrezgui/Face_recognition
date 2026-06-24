import os
import time
import logging
import threading
import cv2
import numpy as np
from .config import settings

logger = logging.getLogger(__name__)

# FFmpeg low-latency options for RTSP/RTMP streams
_FFMPEG_LOW_LATENCY_OPTIONS = (
    "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
    "|analyzeduration;0|probesize;32768"
)


class CameraCapture:
    def __init__(self, source: str | None = None):
        effective = source if source is not None else settings.camera_url
        self._raw_source = effective
        self._source, self._is_camera_index = self._resolve_source(effective)
        self._is_network_stream = isinstance(self._source, str) and self._source.startswith(
            ("rtsp://", "rtmp://")
        )
        self._backoff = 1
        self._stopped = False
        self.cap = self._open()

        self._latest_frame: np.ndarray | None = None
        self._frame_lock = threading.Lock()
        self._frame_ready = threading.Event()
        self._grab_thread = threading.Thread(
            target=self._grab_loop, daemon=True, name="cam-grab"
        )
        self._grab_thread.start()

    @staticmethod
    def _resolve_source(source: str):
        if source.startswith(("http://", "https://", "rtsp://", "rtmp://")):
            return source, False
        if source.isdigit():
            return int(source), True
        if os.path.isfile(source):
            return source, False
        return source, False

    @staticmethod
    def _open_dshow(source_idx: int, timeout: float = 8.0) -> "cv2.VideoCapture | None":
        """Open a camera index via DSHOW with a timeout to avoid DSHOW hangs on Windows."""
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
            cap = self._open_dshow(self._source)
            if cap is not None and cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    logger.info("Camera opened: %s (backend=DSHOW)", self._raw_source)
                    self._backoff = 1
                    return cap
                logger.warning("DSHOW opened camera %s but read failed, falling back", self._source)
                cap.release()
            cap = cv2.VideoCapture(self._source)
        elif self._is_network_stream:
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

        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        backend = "FFMPEG(low-latency)" if self._is_network_stream else "default"
        logger.info("Camera opened: %s (backend=%s)", self._raw_source, backend)
        self._backoff = 1
        return cap

    def _grab_loop(self) -> None:
        """Background thread that drains the camera buffer at full speed."""
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
        self._frame_ready.set()
        self._grab_thread.join(timeout=2.0)
        self.cap.release()
