# GateVision System Reference

Face recognition access-control platform composed of three services: a Python AI service, a .NET backend API, and a Next.js dashboard.

**Architecture documentation:** [docs/architecture/README.md](docs/architecture/README.md) — C4 diagrams, sequence flows, component graph, dependency report.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables Reference](#environment-variables-reference)
   - [Python AI Service (`gate_vision_ai`)](#python-ai-service-gate_vision_ai)
   - [.NET Backend API (`GateVision.Api`)](#net-backend-api-gatevisionapi)
   - [Dashboard (`dashboard`)](#dashboard)
   - [Docker Compose Infrastructure](#docker-compose-infrastructure)
3. [Face Detection — How It Works](#face-detection--how-it-works)
4. [Face Embedding — How It Works](#face-embedding--how-it-works)
5. [Matching & Identification Pipeline](#matching--identification-pipeline)
6. [Port Map](#port-map)

---

## Architecture Overview

```
[IP Camera / RTSP]
        │
        ▼
┌───────────────────┐    ArcFace 512-dim     ┌──────────────────────┐
│  gate_vision_ai   │ ──── embeddings ──────▶│  GateVision.Api      │
│  (Python FastAPI) │ ◀──── identify ────────│  (.NET 9 / ASP.NET)  │
│  port 8001        │                         │  port 5000           │
└───────────────────┘                         └──────────┬───────────┘
                                                         │
                              ┌──────────────────────────┼────────────────────┐
                              ▼                          ▼                    ▼
                        PostgreSQL 16             Qdrant (vector DB)      Redis 7
                        (events, persons)         (face embeddings)       (cache)
                        port 6667                 port 6333/6334          port 6379
                              ▲
                              │  REST + JWT
                        ┌─────┴──────────────┐
                        │  dashboard          │
                        │  (Next.js 15)       │
                        │  port 3000          │
                        └────────────────────┘
```

---

## Environment Variables Reference

### Python AI Service (`gate_vision_ai`)

Configuration file: `gate_vision_ai/.env`  
Template: `gate_vision_ai/.env.example`

All variables are prefixed with `GV_` and loaded via Pydantic `BaseSettings`.

| Variable | Default | Required | Description |
|---|---|---|---|
| `GV_PORT` | `8001` | No | Port the FastAPI server listens on |
| `GV_LOG_LEVEL` | `INFO` | No | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `GV_CAMERA_SOURCE` | `0` | No | Camera source — integer device index or full RTSP URL (e.g. `rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101`) |
| `GV_NET_BACKEND_URL` | — | **Yes** | Base URL of the .NET backend (e.g. `http://localhost:5000`) |
| `GV_NET_API_KEY` | `change-me-to-your-api-key` | **Yes** | API key sent as `X-API-Key` header on all .NET requests |
| `GV_HIKVISION_URL` | — | No | Base URL of the Hikvision camera for ISAPI event subscription (e.g. `http://192.168.1.64`) |
| `GV_HIKVISION_USER` | — | No | Hikvision camera username |
| `GV_HIKVISION_PASSWORD` | — | No | Hikvision camera password |
| `GV_HIKVISION_EVENT_TTL_MS` | `5000` | No | How long (ms) a received Hikvision event gates the face detection pipeline |
| `GV_HIKVISION_EVENT_TYPES` | `regionEntrance` | No | Comma-separated list of Hikvision ISAPI event types to listen for |
| `GV_HIKVISION_DETECTION_TARGET` | `human` | No | Detection target filter sent to Hikvision (`human`, `vehicle`, etc.) |

> **Runtime-persisted config** (written by the API at runtime, survives restarts):
> - `config/video_source.json` — `camera_source`, `direction`
> - `config/python_settings.json` — `processing_fps`, `gate_id`, `detect_max_width`, Hikvision credentials, `hikvision_event_ttl_ms`, `hikvision_event_types`

---

### .NET Backend API (`GateVision.Api`)

Configuration file: `GateVision.Api/.env`  
Template: `GateVision.Api/.env.example`  
Dev overrides: `GateVision.Api/appsettings.Development.json`

| Variable | Example | Required | Description |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | `Host=localhost;Port=6667;Database=gatevision;Username=gatevision;Password=localdev` | **Yes** | PostgreSQL connection string (Npgsql format) |
| `ConnectionStrings__Redis` | `localhost:6379,password=redisdevpass` | No | Redis connection string. If omitted or unreachable, the service starts without caching |
| `Auth__JwtSecret` | *(min 32 chars)* | **Yes** | HMAC-SHA256 secret used to sign and verify JWT tokens |
| `Auth__ApiKey` | `change-me-to-your-api-key` | **Yes** | Shared API key validated on `X-API-Key` header (must match `GV_NET_API_KEY` in Python service) |
| `Qdrant__Host` | `localhost` | **Yes** | Qdrant host |
| `Qdrant__Port` | `6334` | **Yes** | Qdrant gRPC port |
| `Qdrant__CollectionName` | `face_embeddings` | **Yes** | Qdrant collection that stores 512-dim ArcFace vectors |
| `Cors__AllowedOrigins` | `["http://localhost:3000"]` | No | JSON array of allowed CORS origins for the dashboard |

> **Rate limiting (built-in, not configurable via env):**
> - `POST /identify` — 30 requests/second
> - `POST /enroll` — 5 requests/second

---

### Dashboard (`dashboard`)

Configuration file: `dashboard/.env`  
Template: `dashboard/.env.example`

| Variable | Example | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | **Yes** | URL of the .NET backend API, exposed to the browser (public). Used for all REST calls from client components |
| `VISION_SERVICE_URL` | `http://localhost:8001` | **Yes** | URL of the Python FastAPI AI service, used server-side only (Next.js server actions / route handlers). Never exposed to the browser |

> `NEXT_PUBLIC_*` variables are bundled into the client-side JavaScript at build time. `VISION_SERVICE_URL` is only available in server-side Next.js code.

---

### Docker Compose Infrastructure

Defined in `docker-compose.yml`. These are infrastructure variables used by Docker Compose itself; they do not map to the app `.env` files above.

| Service | Variable | Default | Description |
|---|---|---|---|
| `postgres` | `POSTGRES_USER` | `gatevision` | PostgreSQL superuser name |
| `postgres` | `POSTGRES_PASSWORD` | `localdev` | PostgreSQL superuser password |
| `postgres` | `POSTGRES_DB` | `gatevision` | Initial database name |
| `redis` | `REDIS_PASSWORD` | `redisdevpass` | Redis AUTH password (override via shell env `$REDIS_PASSWORD`) |

> Qdrant and Nginx have no environment variable configuration — they use mounted config files (`nginx/` directory and Qdrant defaults).

---

## Face Detection — How It Works

### Model: SCRFD (Sample and Computation Redistribution Face Detector)

The Python service uses [InsightFace](https://github.com/deepinsight/insightface) with the **SCRFD** family of detectors, which is a single-shot anchor-based face detector designed for real-time performance.

**Two profiles are selected automatically based on available hardware:**

| Profile | Model Pack | Input Size | Use Case |
|---|---|---|---|
| `performance` | `buffalo_l` | 640 × 640 | CUDA GPU or fast hardware |
| `lite` | `buffalo_s` | 320 × 320 | DirectML, OpenVINO, CPU |

**Hardware provider selection order (ONNX Runtime):**

```
1. CUDAExecutionProvider   → GPU (NVIDIA CUDA)   → buffalo_l (640×640)
2. DmlExecutionProvider    → GPU (DirectML/DX12)  → buffalo_s (320×320)
3. OpenVINOExecutionProvider → iGPU / Intel VPU  → buffalo_s (320×320)
4. CPUExecutionProvider    → CPU fallback         → buffalo_s (320×320)
```

**Detection pipeline per frame:**

```
Raw frame (OpenCV BGR)
    │
    ▼
Resize to detect_max_width (default 640px wide, preserving aspect ratio)
    │
    ▼
SCRFD detector (ONNX Runtime)
    ├── Bounding boxes (x, y, w, h)
    ├── Detection confidence score
    └── 5-point facial landmarks (eye centers, nose tip, mouth corners)
    │
    ▼
Quality filter
    ├── Confidence ≥ 0.5
    ├── Face width ≥ 40 px
    ├── |Yaw| ≤ 30°  (not too far left/right)
    └── |Pitch| ≤ 30° (not too far up/down)
    │
    ▼
Pose estimation from landmarks
    └── Yaw, pitch, roll angles derived from 5-point keypoint geometry
```

**Motion gating (reduces unnecessary inference):**  
Two strategies are supported to avoid running detection every frame:
- **Software motion:** pixel-difference between frames exceeds a configurable threshold
- **Hardware motion:** Hikvision ISAPI event subscription — the camera sends `regionEntrance` (or configured) events that open a detection window for `GV_HIKVISION_EVENT_TTL_MS` milliseconds

**Subprocess isolation:**  
Detection runs in a `ProcessPoolExecutor` subprocess to bypass Python's GIL, so the asyncio event loop in the main FastAPI process stays responsive while heavy ONNX inference runs in parallel.

---

## Face Embedding — How It Works

### Model: ArcFace (Additive Angular Margin Loss)

After a face is detected by SCRFD, the **ArcFace** recognition head (also part of the InsightFace `buffalo_l` / `buffalo_s` pack) converts the face crop into a compact numerical representation.

**What ArcFace produces:**

- A **512-dimensional floating-point vector** (a list of 512 numbers)
- The vector is **L2-normalized** to unit length, so it lies on the surface of a 512-dimensional unit hypersphere
- Similar faces (same person) produce vectors that are close together on this sphere; different people's faces land far apart

**How the embedding is extracted:**

```
Detected face bounding box
    │
    ▼
Align face using 5-point landmarks
    └── Affine warp to a canonical 112×112 px frontal pose
    │
    ▼
ArcFace recognition network (ONNX)
    └── ResNet-50 backbone with ArcFace loss head
    │
    ▼
512-dim embedding vector (L2 normalized)
```

**ArcFace loss (why it works):**  
ArcFace adds an angular margin penalty during training that pushes embeddings of the same identity tightly together and pushes different identities further apart on the hypersphere — more discriminative than standard softmax. The result is that cosine similarity between two embeddings directly reflects how likely they are to be the same person.

**Enrollment (storing a person):**  
Multiple frames are captured during enrollment. Each valid frame yields one embedding. The final stored embedding is a **weighted average** of all captured embeddings (higher-quality poses weighted more), then re-normalized to unit length. This average embedding is stored in Qdrant as a 512-dim vector tagged with the person's ID.

**Identification (matching at the gate):**

```
Live frame → SCRFD → ArcFace → 512-dim query vector
    │
    ▼
Qdrant cosine similarity search (top-1 nearest neighbor)
    │
    ▼
Score ≥ 0.80  →  Identified  (high confidence)
Score ≥ 0.35  →  NeedsReview (possible match, low confidence)
Score < 0.35  →  Unknown
```

The similarity threshold of **0.80** was chosen empirically to balance false-accept and false-reject rates for frontal faces at typical gate distances.

---

## Matching & Identification Pipeline

End-to-end flow from camera frame to gate decision:

```
Camera frame (RTSP / USB)
    │
    ▼ (motion gate check)
Python DetectorPool (subprocess)
    ├── SCRFD: detect faces + landmarks
    └── ArcFace: extract 512-dim embedding per face
    │
    ▼ (quality + pose filter)
InteractionWindowManager (250 ms window)
    └── Aggregates multiple detections per person into one snapshot
    │
    ▼ HTTP POST /identify  (X-API-Key)
GateVision.Api (.NET)
    ├── Qdrant: cosine similarity search → candidate + score
    ├── Redis: look up person metadata (name, dept, welcome message)
    └── Return: { personId, name, confidence, status }
    │
    ▼
Python routes.py
    └── Logs GateEvent (direction, timestamp, face crop, confidence)
    │
    ▼
Dashboard
    └── Real-time event feed + access decision display
```

---

## Port Map

| Service | Host Port | Notes |
|---|---|---|
| Dashboard (Next.js) | `3000` | Dev: `npm run dev` |
| .NET Backend API | `5000` | HTTP |
| Python AI Service | `8001` | FastAPI / uvicorn |
| PostgreSQL | `6667` | Mapped from internal 5432 |
| Redis | `6379` | Optional; service degrades gracefully without it |
| Qdrant HTTP | `6333` | REST API + dashboard UI |
| Qdrant gRPC | `6334` | Used by .NET backend |
| Hikvision Camera | `554` | RTSP stream |
| Hikvision ISAPI | `80` | HTTP event subscription |
