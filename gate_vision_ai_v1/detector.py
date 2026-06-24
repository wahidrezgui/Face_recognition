import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

import numpy as np
from insightface.app import FaceAnalysis

from .config import settings

logger = logging.getLogger(__name__)

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


@dataclass
class FaceResult:
    bbox: list[float]                      # [x1, y1, x2, y2]
    confidence: float
    landmarks: list[list[float]] | None    # 5-point kps
    embedding: np.ndarray | None           # float32 (512,), L2-normalised
    pose: list[float] | None               # [pitch, yaw, roll]
    age: float | None = None
    gender: str | None = None


def _build_provider_list() -> list[str]:
    if settings.force_cpu:
        logger.info("GV1_FORCE_CPU=true — using CPUExecutionProvider only")
        return ["CPUExecutionProvider"]
    try:
        import onnxruntime as ort
        available = set(ort.get_available_providers())
    except Exception:
        return ["CPUExecutionProvider"]
    providers = [p for p in _PROVIDER_PRIORITY if p in available]
    return providers or ["CPUExecutionProvider"]


def _det_size_for_pack(pack: str) -> tuple[int, int]:
    return (640, 640) if pack == "buffalo_l" else (320, 320)


class FaceDetector:
    """Runs InsightFace inference in-process via a dedicated ThreadPoolExecutor(1).

    ONNX Runtime releases the Python GIL during graph execution, so a single background
    thread keeps the asyncio event loop unblocked without needing subprocess IPC.
    """

    def __init__(self) -> None:
        self.provider_chain = _build_provider_list()
        self.model_pack = settings.model_pack
        self.det_size = _det_size_for_pack(self.model_pack)
        self.active_provider = _PROVIDER_LABELS.get(
            self.provider_chain[0], self.provider_chain[0]
        )

        logger.info(
            "Loading InsightFace in-process (model=%s det_size=%s provider=%s)...",
            self.model_pack, self.det_size, self.active_provider,
        )
        self._app = FaceAnalysis(name=self.model_pack, providers=self.provider_chain)
        self._app.prepare(ctx_id=0, det_size=self.det_size)

        self._executor = ThreadPoolExecutor(
            max_workers=1, thread_name_prefix="insightface"
        )

        # Warm up: force ONNX JIT compilation now so first real frame is fast
        warmup = np.zeros((64, 64, 3), dtype=np.uint8)
        self._app.get(warmup)

        logger.info(
            "FaceDetector ready — model=%s det_size=%s provider=%s",
            self.model_pack, self.det_size, self.active_provider,
        )

    def _detect_sync(self, frame: np.ndarray) -> list[FaceResult]:
        results = []
        faces = self._app.get(frame)
        for face in faces:
            det_score = float(
                face.det_score if hasattr(face, "det_score") and face.det_score is not None
                else (face.score if face.score is not None else 0.0)
            )
            if det_score < settings.min_face_confidence:
                continue

            emb: np.ndarray | None = None
            if face.embedding is not None:
                e = np.array(face.embedding, dtype=np.float32)
                norm = float(np.linalg.norm(e))
                emb = e / norm if norm > 0 else e

            pose = None
            if hasattr(face, "pose") and face.pose is not None:
                pose = [float(v) for v in face.pose]

            age = float(face.age) if hasattr(face, "age") and face.age is not None else None
            gender = None
            if hasattr(face, "gender") and face.gender is not None:
                gender = "Male" if int(face.gender) == 1 else "Female"

            results.append(FaceResult(
                bbox=[float(x) for x in face.bbox],
                confidence=det_score,
                landmarks=face.kps.tolist() if face.kps is not None else None,
                embedding=emb,
                pose=pose,
                age=age,
                gender=gender,
            ))
        return results

    async def detect(self, frame: np.ndarray) -> list[FaceResult]:
        detect_frame = frame
        inv_scale: float = 1.0

        if settings.detect_max_width > 0 and frame.shape[1] > settings.detect_max_width:
            import cv2
            scale = settings.detect_max_width / frame.shape[1]
            new_w = settings.detect_max_width
            new_h = int(frame.shape[0] * scale)
            detect_frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            inv_scale = 1.0 / scale

        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(self._executor, self._detect_sync, detect_frame)

        if inv_scale != 1.0:
            for r in results:
                r.bbox = [v * inv_scale for v in r.bbox]
                if r.landmarks:
                    r.landmarks = [[pt[0] * inv_scale, pt[1] * inv_scale] for pt in r.landmarks]

        return results

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False)
