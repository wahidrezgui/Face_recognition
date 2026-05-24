import os
from pydantic_settings import BaseSettings
from typing import Literal

_PROJECT_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class Settings(BaseSettings):
    camera_source: str = "0"
    processing_fps: int = 3

    window_duration_ms: int = 250
    max_identity_requests_per_window: int = 3
    greeting_delay_ms: int = 300

    detector_confidence: float = 0.5
    detector_nms: float = 0.4
    detector_input_size: tuple = (640, 640)

    min_face_confidence: float = 0.5
    min_face_size: int = 40
    max_yaw: int = 30

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
