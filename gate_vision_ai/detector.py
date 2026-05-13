import logging
import numpy as np
from typing import Optional
from insightface.app import FaceAnalysis
from .config import settings

logger = logging.getLogger(__name__)


class FaceDetector:
    def __init__(self):
        self.app = FaceAnalysis(
            name=settings.model_package,
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider'],
        )
        self.app.prepare(
            ctx_id=0,
            det_size=settings.detector_input_size,
        )
        # Determine which execution provider was actually selected
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
            active_provider = "GPU (CUDA)" if "CUDAExecutionProvider" in available else "CPU"
        except Exception:
            active_provider = "CPU"
        logger.info(
            "InsightFace detector ready (%s) — running on %s", settings.model_package, active_provider
        )

    def detect(self, frame: np.ndarray) -> list:
        faces = self.app.get(frame)
        results = []
        for face in faces:
            det_score = float(face.det_score if hasattr(face, 'det_score') and face.det_score is not None else (face.score if face.score is not None else 0.0))
            if det_score < settings.detector_confidence:
                continue
            bbox = [float(face.bbox[0]), float(face.bbox[1]),
                    float(face.bbox[2]), float(face.bbox[3])]
            landmarks = face.kps.tolist() if face.kps is not None else None
            face_data = {
                "bbox": bbox,
                "confidence": det_score,
                "landmarks": landmarks,
                "embedding": face.embedding.astype(np.float32),
            }
            # Add pose (pitch, yaw, roll) if available
            if hasattr(face, 'pose') and face.pose is not None:
                face_data["pose"] = [float(v) for v in face.pose]
            # Add age and gender if available from the model
            if hasattr(face, 'age') and face.age is not None:
                face_data["age"] = float(face.age)
            if hasattr(face, 'gender') and face.gender is not None:
                face_data["gender"] = face.gender
                if hasattr(face, 'gender_probability') and face.gender_probability is not None:
                    face_data["gender_probability"] = float(face.gender_probability)
            results.append(face_data)
        return results