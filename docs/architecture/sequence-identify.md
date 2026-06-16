# Sequence: Face Identification

```mermaid
sequenceDiagram
  participant Cam as IP Camera
  participant Agent as Python Agent
  participant API as GateVision.Api
  participant Qdrant as Qdrant
  participant Redis as Redis
  participant PG as PostgreSQL
  participant SSE as SSE Channel
  participant Desk as Dashboard/Kiosk

  Cam->>Agent: Video frame
  Agent->>Agent: Detect face, ArcFace 512-dim
  Agent->>API: POST /api/v1/identify
  API->>Qdrant: ANN search minScore 0.35
  Qdrant-->>API: VectorMatch personId, score
  API->>Redis: GetPersonAsync
  alt cache miss
    API->>PG: Load person by id
    API->>Redis: SetPersonAsync
  end
  API->>API: EventBufferService.BufferOrUpdate
  API->>API: WelcomeDedupService.ShouldPublish
  API->>SSE: Publish gate event
  SSE-->>Desk: SSE data event
  API-->>Agent: personId, confidence, status
  Note over API,PG: Periodic flush persists buffer to gate_events
```

## Key decisions

- **Track buffering**: Same `track_id` merges frames; only best-confidence frame triggers SSE
- **Training mode**: Unknown faces stored as `training_events` when enabled
- **Auto-validation**: Confidence > 0.85 creates `validated_events` on flush
