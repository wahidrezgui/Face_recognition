import uvicorn
from .main import app
from .config import settings

uvicorn.run(
    app,
    host="0.0.0.0",
    port=settings.port,
    log_level=settings.log_level.lower(),
)
