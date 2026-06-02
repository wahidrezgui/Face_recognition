FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .[cpu]

# Copy source
COPY . .

# Default env overrides (set via docker-compose or -e)
ENV GV_PORT=8000 \
    GV_GATE_ID=default \
    GV_NET_BACKEND_URL=http://gatevision-api:5000 \
    GV_NET_API_KEY= \
    GV_LOCAL_BUFFER_PATH=/data/gate_events_local.db

VOLUME /data

EXPOSE 8000

CMD ["python", "-m", "gate_vision_ai"]
