import logging
import numpy as np
from concurrent.futures import ProcessPoolExecutor
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


def _worker_init(model_pkg: str, det_size_w: int, det_size_h: int,
                 provider_chain: list, det_thresh: float) -> None:
    """Called once when the worker process starts. Loads InsightFace into _worker_app."""
    global _worker_app, _worker_thresh
    _worker_app = FaceAnalysis(name=model_pkg, providers=provider_chain)
    _worker_app.prepare(ctx_id=0, det_size=(det_size_w, det_size_h))
    _worker_thresh = det_thresh


def _worker_detect(frame_bytes: bytes, shape: tuple, dtype_str: str) -> list:
    """Deserialise a frame, run InsightFace, return picklable results.

    Embeddings are returned as plain lists (not numpy arrays) so they cross the
    process boundary without special pickling. DetectorPool.detect() converts them
    back to float32 arrays after receiving them.
    """
    frame = np.frombuffer(frame_bytes, dtype=np.dtype(dtype_str)).reshape(shape)
    faces = _worker_app.get(frame)
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
            ),
        )
        # Submit a dummy frame to force the worker to start and load the model now.
        # Without this, model loading (~5–10s) would hit the first real detection call.
        _dummy = np.zeros((64, 64, 3), dtype=np.uint8)
        self._executor.submit(
            _worker_detect, _dummy.tobytes(), _dummy.shape, _dummy.dtype.str
        ).result()

        logger.info(
            "InsightFace ready (subprocess) — model=%s det_size=%s profile=%s(%s) provider=%s",
            model_pkg, det_size, settings.model_profile, resolved, self.active_provider,
        )

    def detect(self, frame: np.ndarray) -> list:
        """Submit frame to the worker and block until results arrive.

        Blocking is intentional — callers in async contexts must wrap this with
        asyncio.to_thread() so the wait happens in a thread, not the event loop.
        """
        raw = self._executor.submit(
            _worker_detect, frame.tobytes(), frame.shape, frame.dtype.str
        ).result()
        for r in raw:
            if "embedding" in r:
                r["embedding"] = np.array(r["embedding"], dtype=np.float32)
        return raw

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
