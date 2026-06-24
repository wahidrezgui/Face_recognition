import os
from pydantic_settings import BaseSettings

# Resolve .env relative to this file so the correct .env is loaded
# regardless of which directory `python -m gate_vision_ai_v1` is run from.
_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

# Inject .env values into os.environ so that config_loader.py's `env_key in os.environ`
# check sees them and keeps .env values from being overridden by the DB gate config.
# override=False means a real shell env var still beats the .env file.
try:
    from dotenv import load_dotenv
    load_dotenv(_ENV_FILE, override=False)
except ImportError:
    pass


class Settings(BaseSettings):
    port: int = 8001
    camera_url: str = "0"
    processing_fps: int = 25
    model_pack: str = "buffalo_s"           # buffalo_s (320×320) or buffalo_l (640×640)
    recognition_threshold: float = 0.45    # cosine similarity — local search floor (min_match_score)
    identify_min_score: float = 0.80      # minimum score before POSTing to .NET backend
    refire_score_delta: float = 0.03       # re-POST when recognition score improves by this much
    detect_max_width: int = 640
    motion_threshold: float = 0.02
    motion_pixel_threshold: int = 25
    min_face_size: int = 40
    min_face_confidence: float = 0.5
    max_yaw: int = 30
    max_pitch: int = 30
    min_sharpness_score: float = 60.0
    min_brightness: int = 30
    max_brightness: int = 220
    min_track_hits: int = 1
    tracker_max_lost_s: float = 3.0
    faiss_threshold: int = 5000             # switch to FAISS when gallery >= this
    enroll_dedup_threshold: float = 0.95
    force_cpu: bool = False
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"
    local_api_key: str = ""

    # Gate identity — used to fetch per-gate config from the .NET API at startup
    gate_id: str = "default"
    net_backend_url: str = ""               # e.g. http://localhost:5000
    net_api_key: str = ""                   # X-API-Key header for the .NET backend

    # Gate behaviour flags — synced from DB at startup via config_loader
    log_unknown: bool = False     # fire identify events for unrecognised faces too
    training_mode: bool = False   # informational; backend routes unknowns to training storage

    # Qdrant — face embedding source loaded at startup
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "face_embeddings"

    model_config = {"env_prefix": "GV1_", "env_file": _ENV_FILE, "extra": "ignore"}


settings = Settings()
