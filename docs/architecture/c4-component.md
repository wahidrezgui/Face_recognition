# C4 Level 3 — Components (GateVision.Api)

> C4-style component view using standard Mermaid `flowchart`.

```mermaid
flowchart TB
  subgraph apiHost [GateVision.Api]
    platform["Platform<br/>Auth and Health"]
    identity["Identity<br/>Persons and Enrollment"]
    accessEvents["AccessEvents<br/>Events and SSE"]
    gateOps["GateOperations<br/>Gates and Python proxy"]
    hrSync["HrSync<br/>Employee import"]
    shared["Shared.Infrastructure<br/>DbContext Redis middleware"]
  end

  postgres[("PostgreSQL")]
  qdrant[("Qdrant")]
  redis[("Redis")]
  pythonAgent["Python Agent"]

  platform --> shared
  identity --> shared
  accessEvents --> shared
  gateOps --> shared
  hrSync --> shared
  accessEvents -->|"person lookup"| identity
  hrSync -->|"create persons"| identity
  identity -->|"IVectorStore"| qdrant
  accessEvents -->|"identify"| qdrant
  shared -->|"EF Core"| postgres
  shared -->|"cache"| redis
  gateOps -->|"HTTP proxy"| pythonAgent
  hrSync -->|"persons"| postgres
```

## Feature module layout

```
Features/
  Identity/       Person aggregate, enrollment, face storage
  AccessEvents/   GateEvent, TrainingEvent, ValidatedEvent, identify pipeline
  GateOperations/ Gate entity, Python gateway, kiosk config
  HrSync/         MySQL employee import
  Platform/       Auth token, health
Shared/
  Kernel/         Result, PagedResult, shared enums
  Infrastructure/ AppDbContext, AuthMiddleware, hosted services
```

## Dependency rule

`Api → Application → Domain`; Infrastructure implements ports; Domain never references Api.
