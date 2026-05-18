import os
import time
import logging
import cv2
import numpy as np
from .config import settings

logger = logging.getLogger(__name__)

_BASE = os.path.dirname(os.path.abspath(__file__))


class CameraCapture:
    def __init__(self, source: str | None = None):
        effective = source if source is not None else settings.camera_source
        self._raw_source = effective
        self._source, self._is_camera_index = self._resolve_source(effective)
        self._backoff = 1
        self._stopped = False
        self.cap = self._open()

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

    def _open(self) -> cv2.VideoCapture:
        if self._is_camera_index:
            # Windows MSMF has issues with many USB webcams; DSHOW is more reliable.
            cap = cv2.VideoCapture(self._source, cv2.CAP_DSHOW)
        else:
            cap = cv2.VideoCapture(self._source)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera source: {self._raw_source}")
        logger.info("Camera opened: %s -> %s (backend=%s)", self._raw_source, self._source,
                     "DSHOW" if self._is_camera_index else "default")
        self._backoff = 1
        return cap

    def read_frame(self) -> np.ndarray | None:
        if self._stopped:
            return None
        ret, frame = self.cap.read()
        if ret:
            self._backoff = 1
            return frame
        if self._stopped:
            return None
        logger.warning("Frame read failed, reconnecting in %ds...", self._backoff)
        time.sleep(self._backoff)
        self._backoff = min(self._backoff * 2, 30)
        self.cap.release()
        if self._stopped:
            return None
        try:
            self.cap = self._open()
        except RuntimeError:
            logger.error("Reconnect failed, will retry")
        return None

    def release(self):
        self._stopped = True
        self.cap.release()
