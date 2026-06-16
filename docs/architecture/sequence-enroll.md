# Sequence: Face Enrollment

```mermaid
sequenceDiagram
  participant UI as Dashboard
  participant API as GateVision.Api
  participant Agent as Python Agent
  participant PG as PostgreSQL
  participant Qdrant as Qdrant
  participant FS as FaceImages disk

  UI->>API: POST /api/v1/gates/{id}/enroll/webcam
  API->>Agent: Proxy POST /enroll/webcam
  Agent->>Agent: Capture frames, quality check, embed
  Agent->>API: POST /api/v1/persons/{id}/enroll
  API->>API: EnrollmentService.Enroll
  API->>Qdrant: UpsertAsync per pose
  API->>FS: Save face crop JPEG
  API->>PG: person.Activate, SaveChanges
  API-->>Agent: enrolled
  API-->>UI: accepted, rejected frames

  Note over UI,FS: Alternative: direct enroll via API with pre-computed embeddings
```

## Enrollment paths

| Path | Entry point |
|------|-------------|
| Webcam via gate | Dashboard → API proxy → Python → callback enroll |
| Profile bulk | `bulk-enroll-profiles` reads disk profile image |
| HR import | `HrSync` fetches photo from MySQL uploads path |
