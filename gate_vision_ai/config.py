import os
from pydantic_settings import BaseSettings
from typing import Literal

_PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class Settings(BaseSettings):
    port: int = 8000
    camera_source: str = "0"
    processing_fps: int = 3

    gate_id: str = "default"

    window_duration_ms: int = 250
    max_identity_requests_per_window: int = 3
    greeting_delay_ms: int = 300

    detector_confidence: float = 0.5
    detector_nms: float = 0.4
    detector_input_size: tuple | None = None  # None = use profile default; set to override e.g. (480, 480)

    min_face_confidence: float = 0.5
    min_face_size: int = 40
    max_yaw: int = 30

    local_buffer_path: str = "gate_events_local.db"

    net_backend_url: str = "http://localhost:5000"
    net_identify_path: str = "/api/identify"
    net_enroll_path: str = "/api/persons/{person_id}/enroll"
    net_timeout: int = 5
    net_api_key: str = ""
    net_circuit_threshold: int = 5
    net_circuit_reset_timeout: float = 30.0

    roi_x: int = 0
    roi_y: int = 0
    roi_width: int = 0
    roi_height: int = 0

    direction: str = "entry"

    log_level: str = "INFO"

    model_package: str = "buffalo_l"
    model_profile: str = "auto"  # "auto" | "performance" | "lite"

    motion_threshold: float = 0.02    # min fraction of pixels changed to count as motion; 0 = disabled
    motion_pixel_threshold: int = 25  # per-pixel change magnitude (0–255) to count as "changed"

    detect_max_width: int = 0  # downscale frame to this width before detection; 0 = disabled (use full res)

    class Config:
        env_prefix = "GV_"
        env_file = os.path.join(os.path.dirname(__file__), ".env")

    @property
    def video_source_config_path(self) -> str:
        return os.path.join(_PROJECT_ROOT, "config", "video_source.json")

    @property
    def python_settings_config_path(self) -> str:
        return os.path.join(_PROJECT_ROOT, "config", "python_settings.json")


settings = Settings()
