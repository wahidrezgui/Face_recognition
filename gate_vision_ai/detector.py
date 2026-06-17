import logging
import threading
import cv2
import numpy as np
from concurrent.futures import ProcessPoolExecutor
from multiprocessing.shared_memory import SharedMemory
from insightface.app import FaceAnalysis
from .config import settings

logger = logging.getLogger(__name__)

# profile name → (model_package, det_size)
_PROFILES: dict[str, tuple[str, tuple[int, int]]] = {
    "performance": ("buffalo_l", (640, 640)),
    "lite":        ("buffalo_s", (320, 320)),
}

# Probed in this order; first available wins
_PROVIDER_PRIORITY = [
    "CUDAExecutionProvider",
    "DmlExecutionProvider",
    "OpenVINOExecutionProvider",
    "CPUExecutionProvider",
]

_PROVIDER_LABELS = {
    "CUDAExecutionProvider":     "GPU (CUDA)",
    "DmlExecutionProvider":      "GPU (DirectML)",
    "OpenVINOExecutionProvider": "CPU/iGPU (OpenVINO)",
    "CPUExecutionProvider":      "CPU",
}

_SHM_MAX_BYTES: int = 1920 * 1080 * 3  # sufficient for a full 1080p BGR frame


def _build_provider_list() -> list[str]:
    """Return available ONNX Runtime providers in priority order (CUDA > DirectML > OpenVINO > CPU)."""
    try:
        import onnxruntime as ort
        available = set(ort.get_available_providers())
    except Exception:
        return ["CPUExecutionProvider"]
    providers = [p for p in _PROVIDER_PRIORITY if p in available]
    return providers or ["CPUExecutionProvider"]


def _resolve_profile(providers: list[str]) -> tuple[str, tuple[int, int], str]:
    """Return (model_package, det_size, resolved_profile_name).

    "auto" uses the heavy model only when CUDA is the top provider. DirectML and
    OpenVINO are mid-tier — they pair better with the lite model by default.
    detector_input_size in settings overrides the profile's default det_size when set.
    """
    profile = settings.model_profile.lower()
    if profile in _PROFILES:
        model_pkg, det_size = _PROFILES[profile]
        resolved = profile
    else:
        cuda_first = providers[0] == "CUDAExecutionProvider"
        resolved = "performance" if cuda_first else "lite"
        model_pkg, det_size = _PROFILES[resolved]
        logger.info(
            "model_profile=auto → '%s' (top provider: %s)", resolved, providers[0]
        )

    override = settings.detector_input_size
    if override is not None:
        det_size = (int(override[0]), int(override[1]))
        logger.info(
            "det_size overridden to %s (profile default was %s)", det_size, _PROFILES[resolved][1]
        )

    return model_pkg, det_size, resolved


# ── Worker-process state ───────────────────────────────────────────────────────
# These module-level vars exist only in the subprocess. The main process never
# calls _worker_detect directly — it always goes through the ProcessPoolExecutor.

_worker_app = None
_worker_thresh = 0.5
_worker_shm: "SharedMemory | None" = None


def _worker_init(model_pkg: str, det_size_w: int, det_size_h: int,
                 provider_chain: list, det_thresh: float, shm_name: str = "") -> None:
    """Called once when the worker process starts. Loads InsightFace and attaches shared memory."""
    # On Windows, ProcessPoolExecutor uses spawn — fresh interpreter with no logging handlers.
    # Configure a minimal handler so worker warnings reach the parent's console.
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s [worker] %(levelname)s: %(message)s")
    global _worker_app, _worker_thresh, _worker_shm
    _worker_app = FaceAnalysis(name=model_pkg, providers=provider_chain)
    _worker_app.prepare(ctx_id=0, det_size=(det_size_w, det_size_h))
    _worker_thresh = det_thresh
    if shm_name:
        try:
            _worker_shm = SharedMemory(name=shm_name, create=False)
        except Exception as e:
            logger.warning("Worker: could not attach shared memory '%s': %s", shm_name, e)
            _worker_shm = None


def _faces_to_results(faces: list) -> list:
    """Convert InsightFace face objects to picklable dicts."""
    results = []
    for face in faces:
        det_score = float(
            face.det_score if hasattr(face, 'det_score') and face.det_score is not None
            else (face.score if face.score is not None else 0.0)
        )
        if det_score < _worker_thresh:
            continue
        entry = {
            "bbox": [float(x) for x in face.bbox],
            "confidence": det_score,
            "landmarks": face.kps.tolist() if face.kps is not None else None,
            "embedding": face.embedding.tolist(),
        }
        if hasattr(face, 'pose') and face.pose is not None:
            entry["pose"] = [float(v) for v in face.pose]
        if hasattr(face, 'age') and face.age is not None:
            entry["age"] = float(face.age)
        if hasattr(face, 'gender') and face.gender is not None:
            entry["gender"] = "Male" if int(face.gender) == 1 else "Female"
            if hasattr(face, 'gender_probability') and face.gender_probability is not None:
                entry["gender_probability"] = float(face.gender_probability)
        results.append(entry)
    return results


def _worker_detect(frame_bytes: bytes, shape: tuple, dtype_str: str) -> list:
    """Fallback: deserialise frame from bytes, run InsightFace, return picklable results."""
    frame = np.frombuffer(frame_bytes, dtype=np.dtype(dtype_str)).reshape(shape).copy()
    return _faces_to_results(_worker_app.get(frame))


def _worker_detect_shm(shape: tuple, dtype_str: str) -> list:
    """Zero-copy path: read frame from shared memory, run InsightFace."""
    if _worker_shm is None:
        return []
    frame = np.ndarray(shape, dtype=np.dtype(dtype_str), buffer=_worker_shm.buf).copy()
    return _faces_to_results(_worker_app.get(frame))


def _worker_embed_crop(frame_bytes: bytes, shape: tuple, dtype_str: str) -> list | None:
    """Directly embed an already-cropped face image using only the ArcFace recognition model.

    Bypasses SCRFD detection — use when we KNOW the image is a face but the detector fails
    to re-locate it. Applies an estimated affine warp to the ArcFace canonical 112x112
    template using standard face-proportion landmarks, which is significantly more accurate
    than a raw resize and keeps embeddings in the same distribution ArcFace was trained on.

    Returns an L2-normalised embedding as a plain Python list, or None on failure.
    """
    global _worker_app
    if _worker_app is None:
        return None
    rec_model = _worker_app.models.get("recognition")
    if rec_model is None:
        return None
    frame = np.frombuffer(frame_bytes, dtype=np.dtype(dtype_str)).reshape(shape).copy()
    h, w = frame.shape[:2]

    # Estimate source landmarks from standard frontal face proportions.
    src_pts = np.array([
        [w * 0.30, h * 0.35],  # left eye
        [w * 0.70, h * 0.35],  # right eye
        [w * 0.50, h * 0.50],  # nose tip
    ], dtype=np.float32)
    # ArcFace canonical 112x112 destination landmarks (3-point subset of the 5-point template).
    dst_pts = np.array([
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
    ], dtype=np.float32)

    M, _ = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.LMEDS)
    if M is not None:
        aligned = cv2.warpAffine(frame, M, (112, 112), borderMode=cv2.BORDER_REPLICATE)
    else:
        aligned = cv2.resize(frame, (112, 112))

    try:
        feats = rec_model.get_feat([aligned])
        if feats is None or len(feats) == 0:
            return None
        emb = np.array(feats[0], dtype=np.float32)
        norm = float(np.linalg.norm(emb))
        if norm > 0:
            emb = emb / norm
        return emb.tolist()
    except Exception:
        return None


# ── Main-process detector pool ─────────────────────────────────────────────────

class DetectorPool:
    """
    Runs InsightFace inference in a dedicated subprocess via ProcessPoolExecutor.

    Moving inference out of the main process eliminates GIL contention between
    ONNX Runtime's internal thread pool and the asyncio event loop, keeping HTTP
    serving and frame streaming fully responsive during detection.

    Call detect() via asyncio.to_thread() from async contexts:
        faces = await asyncio.to_thread(detector.detect, frame)

    From sync FastAPI route handlers (already in a threadpool) call directly:
        faces = detector.detect(frame)
    """

    def __init__(self):
        self.provider_chain = _build_provider_list()
        model_pkg, det_size, resolved = _resolve_profile(self.provider_chain)
        self.model_package = model_pkg
        self.det_size = det_size
        self.resolved_profile = resolved
        self.active_provider = _PROVIDER_LABELS.get(self.provider_chain[0], self.provider_chain[0])

        # Try to allocate shared memory to avoid serialize/deserialize per frame
        self._shm: SharedMemory | None = None
        self._shm_lock = threading.Lock()
        shm_name = ""
        try:
            self._shm = SharedMemory(create=True, size=_SHM_MAX_BYTES)
            shm_name = self._shm.name
            logger.info("Shared memory allocated: name=%s size=%dMB",
                        shm_name, _SHM_MAX_BYTES // (1024 * 1024))
        except Exception as e:
            logger.warning("Shared memory unavailable (%s) — using copy-based IPC", e)

        logger.info(
            "Starting detection worker (model=%s det_size=%s provider=%s)...",
            model_pkg, det_size, self.active_provider,
        )
        self._executor = ProcessPoolExecutor(
            max_workers=1,
            initializer=_worker_init,
            initargs=(
                model_pkg, det_size[0], det_size[1],
                self.provider_chain,
                settings.detector_confidence,
                shm_name,
            ),
        )
        # Warm up: force model load now so first real detection isn't delayed ~5-10s
        _dummy = np.zeros((64, 64, 3), dtype=np.uint8)
        if self._shm is not None:
            np.copyto(np.ndarray(_dummy.shape, dtype=_dummy.dtype, buffer=self._shm.buf), _dummy)
            self._executor.submit(_worker_detect_shm, _dummy.shape, _dummy.dtype.str).result()
        else:
            self._executor.submit(_worker_detect, _dummy.tobytes(), _dummy.shape, _dummy.dtype.str).result()

        logger.info(
            "InsightFace ready (subprocess) — model=%s det_size=%s profile=%s(%s) provider=%s shm=%s",
            model_pkg, det_size, settings.model_profile, resolved, self.active_provider,
            "enabled" if self._shm else "disabled",
        )

    def detect(self, frame: np.ndarray) -> list:
        """Submit frame to the worker and block until results arrive.

        Uses shared memory when available (zero-copy), falls back to tobytes() IPC.
        Blocking is intentional — callers in async contexts must wrap with asyncio.to_thread().
        """
        if self._shm is not None and frame.nbytes <= _SHM_MAX_BYTES:
            with self._shm_lock:
                np.copyto(np.ndarray(frame.shape, dtype=frame.dtype, buffer=self._shm.buf), frame)
                raw = self._executor.submit(_worker_detect_shm, frame.shape, frame.dtype.str).result()
        else:
            raw = self._executor.submit(
                _worker_detect, frame.tobytes(), frame.shape, frame.dtype.str
            ).result()
        for r in raw:
            if "embedding" in r:
                r["embedding"] = np.array(r["embedding"], dtype=np.float32)
        return raw

    def embed_crop(self, frame: np.ndarray) -> np.ndarray | None:
        """Directly embed a known face crop without running detection.

        Useful when SCRFD fails to re-detect in an already-tight gate camera crop.
        Uses estimated affine alignment to the ArcFace 112x112 canonical template.
        Returns an L2-normalised float32 numpy array, or None on failure.
        """
        logger.warning(
            "embed_crop fallback invoked (shape=%s) — no landmark alignment available; "
            "embedding quality lower than full detection pipeline",
            frame.shape,
        )
        raw = self._executor.submit(
            _worker_embed_crop, frame.tobytes(), frame.shape, frame.dtype.str
        ).result()
        if raw is None:
            return None
        return np.array(raw, dtype=np.float32)

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
        if self._shm is not None:
            try:
                self._shm.close()
                self._shm.unlink()
            except Exception:
                pass
