import os
import time
import logging
import cv2
import numpy as np
from .config import settings

logger = logging.getLogger(__name__)

_BASE = os.path.dirname(os.path.abspath(__file__))


class CameraCapture:
    def __init__(self):
        self._raw_source = settings.camera_source
        self._source = self._resolve_source(settings.camera_source)
        self._backoff = 1
        self.cap = self._open()

    @staticmethod
    def _resolve_source(source: str):
        if source.isdigit():
            return int(source)
        if source.startswith(("http://", "https://", "rtsp://", "rtmp://")):
            return source
        maybe_path = os.path.normpath(os.path.join(_BASE, source.lstrip("./\\")))
        if os.path.isfile(maybe_path):
            return maybe_path
        return source

    def _open(self) -> cv2.VideoCapture:
        cap = cv2.VideoCapture(self._source)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open camera source: {self._raw_source}")
        logger.info("Camera opened: %s -> %s", self._raw_source, self._source)
        self._backoff = 1
        return cap

    def read_frame(self) -> np.ndarray | None:
        ret, frame = self.cap.read()
        if ret:
            self._backoff = 1
            return frame
        logger.warning("Frame read failed, reconnecting in %ds...", self._backoff)
        time.sleep(self._backoff)
        self._backoff = min(self._backoff * 2, 30)
        self.cap.release()
        try:
            self.cap = self._open()
        except RuntimeError:
            logger.error("Reconnect failed, will retry")
        return None

    def release(self):
        self.cap.release()
