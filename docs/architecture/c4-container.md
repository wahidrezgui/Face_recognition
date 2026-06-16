# C4 Level 2 — Containers

> C4-style container view using standard Mermaid `flowchart`.

```mermaid
flowchart TB
  operator["Operator"]
  visitor["Visitor"]

  subgraph platform [GateVision Platform]
    dashboard["Dashboard<br/>Next.js 15"]
    api["GateVision.Api<br/>.NET 9 ASP.NET Core"]
    agent["Edge Agent<br/>Python FastAPI"]
  end

  postgres[("PostgreSQL 16")]
  qdrant[("Qdrant")]
  redis[("Redis 7")]
  mysql[("MySQL HR")]

  operator -->|"HTTPS"| dashboard
  visitor -->|"camera frame"| agent
  dashboard -->|"REST JWT"| api
  dashboard -->|"SSE stream"| api
  agent -->|"identify and config"| api
  api -->|"EF Core"| postgres
  api -->|"ANN search"| qdrant
  api -->|"cache"| redis
  api -->|"HR sync"| mysql
```

## Deployment notes

- **Docker Compose** runs Postgres (`:6667`), Redis, Qdrant, MySQL test only
- **Host processes**: `GateVision.Api` (`:5000`), `dashboard` (`:3000`), edge agents (`:8000+`)

See [deployment.mmd](deployment.mmd) for full topology.
