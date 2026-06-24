import numpy as np
from scipy.optimize import linear_sum_assignment as _hungarian

from .config import settings


def _bbox_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    x1 = max(ax1, bx1); y1 = max(ay1, by1)
    x2 = min(ax2, bx2); y2 = min(ay2, by2)
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class _KalmanTrack:
    """Constant-velocity Kalman filter for a single face track.
    State vector: [cx, cy, w, h, vx, vy, vw, vh]
    """

    def __init__(self, bbox: list[float], track_id: int) -> None:
        self.id = track_id
        self.hits = 0
        self.last_seen: float = 0.0
        self.confirmed = False
        cx, cy, w, h = self._to_cwh(bbox)
        self._x = np.array([cx, cy, w, h, 0.0, 0.0, 0.0, 0.0])
        self._F = np.eye(8); self._F[0, 4] = self._F[1, 5] = self._F[2, 6] = self._F[3, 7] = 1.0
        self._H = np.zeros((4, 8)); self._H[0, 0] = self._H[1, 1] = self._H[2, 2] = self._H[3, 3] = 1.0
        self._Q = np.diag([1.0, 1.0, 1.0, 1.0, 0.01, 0.01, 0.01, 0.01])
        self._R = np.diag([1.0, 1.0, 10.0, 10.0])
        self._P = np.diag([10.0, 10.0, 10.0, 10.0, 100.0, 100.0, 100.0, 100.0])

    @staticmethod
    def _to_cwh(bbox: list[float]) -> tuple:
        x1, y1, x2, y2 = bbox
        return (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1

    @staticmethod
    def _to_bbox(cx: float, cy: float, w: float, h: float) -> list[float]:
        return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]

    def predict(self) -> list[float]:
        self._x = self._F @ self._x
        self._P = self._F @ self._P @ self._F.T + self._Q
        return self._to_bbox(*self._x[:4])

    def update(self, bbox: list[float], now: float) -> None:
        z = np.array(self._to_cwh(bbox))
        innov = z - self._H @ self._x
        S = self._H @ self._P @ self._H.T + self._R
        K = self._P @ self._H.T @ np.linalg.inv(S)
        self._x += K @ innov
        self._P = (np.eye(8) - K @ self._H) @ self._P
        self.hits += 1
        self.last_seen = now
        if self.hits >= settings.min_track_hits:
            self.confirmed = True


class SORTTracker:
    """SORT: Kalman prediction + Hungarian assignment for multi-face tracking."""

    _IOU_THRESHOLD: float = 0.30

    def __init__(self) -> None:
        self._tracks: list[_KalmanTrack] = []
        self._next_id: int = 0
        self._max_lost_s: float = settings.tracker_max_lost_s

    def has_active_tracks(self) -> bool:
        return any(t.confirmed for t in self._tracks)

    def update(self, detections: list[list[float]], now: float) -> list[tuple[int, bool]]:
        """Return (track_id, is_confirmed) for each input detection, preserving order."""
        self._tracks = [t for t in self._tracks if now - t.last_seen <= self._max_lost_s]
        n_t, n_d = len(self._tracks), len(detections)
        det_results: dict[int, tuple[int, bool]] = {}

        if n_t == 0:
            for di, bbox in enumerate(detections):
                t = self._spawn(bbox, now)
                det_results[di] = (t.id, t.confirmed)
            return [det_results[di] for di in range(n_d)]

        preds = [t.predict() for t in self._tracks]
        iou_mat = np.array([[_bbox_iou(preds[ti], detections[di]) for di in range(n_d)] for ti in range(n_t)])
        row_ind, col_ind = _hungarian(1.0 - iou_mat)

        matched_d: set[int] = set()
        for ti, di in zip(row_ind, col_ind):
            if iou_mat[ti, di] >= self._IOU_THRESHOLD:
                self._tracks[ti].update(detections[di], now)
                matched_d.add(di)
                det_results[di] = (self._tracks[ti].id, self._tracks[ti].confirmed)

        for di, bbox in enumerate(detections):
            if di not in matched_d:
                t = self._spawn(bbox, now)
                det_results[di] = (t.id, t.confirmed)

        return [det_results[di] for di in range(n_d)]

    def _spawn(self, bbox: list[float], now: float) -> _KalmanTrack:
        self._next_id += 1
        t = _KalmanTrack(bbox, self._next_id)
        t.update(bbox, now)
        self._tracks.append(t)
        return t
