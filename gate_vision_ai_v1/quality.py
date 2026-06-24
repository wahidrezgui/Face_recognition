import math
import base64

import numpy as np
import cv2

from .config import settings


def estimate_pose_from_kps(kps: list) -> tuple[float, float]:
    if not kps or len(kps) < 3:
        return 0.0, 0.0
    le = np.array(kps[0], dtype=float)
    re = np.array(kps[1], dtype=float)
    nose = np.array(kps[2], dtype=float)
    eye_mid = (le + re) / 2
    eye_dist = float(np.linalg.norm(re - le))
    if eye_dist < 1:
        return 0.0, 0.0
    yaw_deg = float((nose[0] - eye_mid[0]) / eye_dist * 70)
    pitch_deg = float((nose[1] - eye_mid[1]) / eye_dist * 70 - 20)
    return yaw_deg, pitch_deg


def yaw_from_landmarks(landmarks: list) -> float:
    if not landmarks or len(landmarks) < 2:
        return 0.0
    le, re = np.array(landmarks[0]), np.array(landmarks[1])
    dx = re[0] - le[0]
    dy = re[1] - le[1]
    return abs(math.degrees(math.atan2(dy, dx)))


def face_sharpness_score(frame: np.ndarray, bbox: list) -> float:
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    gray = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def face_mean_brightness(frame: np.ndarray, bbox: list) -> float:
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return 128.0
    gray = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
    return float(np.mean(gray))


def check_quality(face: dict, frame: np.ndarray | None = None) -> tuple[bool, str]:
    bbox = face["bbox"]
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    if face["confidence"] < settings.min_face_confidence:
        return False, f"low_confidence:{face['confidence']:.2f}"
    if w < settings.min_face_size or h < settings.min_face_size:
        return False, f"small_bbox:{w}x{h}"

    pose = face.get("pose")
    if pose is not None and len(pose) >= 2:
        yaw = abs(float(pose[1]))
        pitch = abs(float(pose[0]))
    elif face.get("landmarks"):
        yaw, pitch = estimate_pose_from_kps(face["landmarks"])
        yaw, pitch = abs(yaw), abs(pitch)
    else:
        yaw, pitch = 0.0, 0.0

    if yaw > settings.max_yaw:
        return False, f"high_yaw:{yaw:.1f}"
    if pitch > settings.max_pitch:
        return False, f"high_pitch:{pitch:.1f}"

    if frame is not None:
        sharpness = face_sharpness_score(frame, bbox)
        if sharpness < settings.min_sharpness_score:
            return False, f"blurry:{sharpness:.1f}"
        brightness = face_mean_brightness(frame, bbox)
        if brightness < settings.min_brightness or brightness > settings.max_brightness:
            return False, f"bad_illumination:{brightness:.0f}"

    return True, ""


def crop_face_b64(frame: np.ndarray, bbox: list) -> str | None:
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return None
    crop = frame[y1:y2, x1:x2]
    ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return None
    return base64.b64encode(buf.tobytes()).decode("ascii")


def decode_base64_frame(b64: str) -> np.ndarray:
    if b64.startswith("data:image"):
        b64 = b64.split(",", 1)[1]
    buf = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def classify_pose(yaw: float, pitch: float) -> str:
    if abs(yaw) <= 20 and abs(pitch) <= 20:
        return "frontal"
    if yaw < -20:
        return "left"
    if yaw > 20:
        return "right"
    if pitch < -20:
        return "up"
    return "down"
