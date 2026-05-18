<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.1 | Updated: 2026-05-18 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and development patterns for GateVision face recognition system.
**Last Updated**: 2026-05-18

## Quick Reference
**Update Triggers**: Tech stack changes | New API endpoints | Component pattern shifts | Security updates
**Audience**: Developers, AI agents

## Primary Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| AI/ML Service | Python — FastAPI, OpenCV, InsightFace | Python 3.x | Face detection/recognition pipeline |
| Backend API | C# — ASP.NET Core, EF Core + Npgsql | .NET 10 | Core business logic & data access |
| Frontend | Next.js + React + TypeScript | Next 15 / React 19 / TS 5.6 | Dashboard UI & real-time monitoring |
| Database | PostgreSQL 16 + pgvector (Docker) | pg16 | Vector embeddings for face matching |
| Cache | Redis 7 (Docker) | 7-alpine | Session caching & event buffering |
| Styling | Tailwind CSS (dark theme) | 3.4 | Consistent dark UI components |
| State | TanStack React Query | 5.60 | Server state management |
| Auth | JWT + API Key | Custom | Token-based authentication |

## Code Patterns

### Python API (FastAPI) — routes.py
```python
class IdentifyRequest(BaseModel):
    embedding: list[float]
    frame_quality: float
    captured_at: str
    direction: str = "entry"

def register_routes(app, state: dict):
    @app.get("/health")
    def health():
        return {"status": "ok", "detector": s["detector"] is not None}
    @app.post("/identify")
    async def identify(req: IdentifyRequest):
        if s["detector"] is None:
            raise HTTPException(503, "detector not available")
        return await process_single_face(...)
```
**Pattern**: `register_routes(app, state)` closure, Pydantic v2 models, async handlers, `HTTPException` for errors, dict responses.

### C# API (ASP.NET Core) — Endpoints/*.cs
```csharp
public static class PersonEndpoints
{
    public static void MapPersonEndpoints(this WebApplication app)
    {
        app.MapGet("/api/persons", async (AppDbContext db, CancellationToken ct) =>
        {
            var persons = await db.Persons.ToListAsync(ct);
            return Results.Ok(persons);
        });
        app.MapPost("/api/persons", async (CreatePersonDto dto, EnrollmentService svc, CancellationToken ct) =>
        {
            var person = await svc.CreatePerson(dto.FullName, dto.Department, ...);
            return Results.Created($"/api/persons/{person.Id}", person);
        });
    }
}
```
**Pattern**: Static class extension methods, Minimal API (`MapGet`/`MapPost`), DI via handler params, `Results.*`, EF Core with Npgsql.

### Frontend Component — TypeScript React
```typescript
interface StatCardProps {
  label: string;
  value: number;
  color?: string;
}
export function StatCard({ label, value, color = "text-emerald-400" }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
```
**Pattern**: Functional components, explicit `{Name}Props` interfaces, Tailwind dark theme, named exports.

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Python files | snake_case | `gate_vision_ai/routes.py`, `embedder.py` |
| Python classes | PascalCase | `IdentifyRequest`, `FaceDetector`, `Settings` |
| Python funcs | snake_case | `register_routes()`, `check_quality()` |
| C# files/classes | PascalCase | `PersonEndpoints.cs`, `AppDbContext` |
| C# methods | PascalCase | `MapPersonEndpoints()`, `CreatePerson()` |
| C# DTOs | PascalCase + `Dto` suffix | `CreatePersonDto`, `EnrollDto` |
| TS/React files | kebab-case | `stat-card.tsx`, `face-display.tsx` |
| TS/React components | PascalCase | `StatCard`, `EventRow`, `NavBar` |
| TS functions | camelCase | `fetchEvents()`, `enrollWithWebcam()` |
| TS interfaces | PascalCase | `GateEvent`, `Person`, `StreamStatus` |
| Config (env) | UPPER_SNAKE + `GV_` prefix | `GV_CAMERA_SOURCE`, `GV_LOG_LEVEL` |
| DB tables | snake_case | `persons`, `face_embeddings`, `gate_events` |

## Code Standards

- **Python**: Pydantic v2 for models & settings, async/await, structured logging, type hints everywhere
- **C#**: EF Core + Npgsql with pgvector, Minimal API endpoints, DbUp migrations, DI via `IServiceCollection`
- **TypeScript**: Strict types on all interfaces/props, `apiFetch` wrapper auto-redirects on 401, `export async function` for API calls
- **Frontend**: `bg-gray-900` base + `border-gray-800` cards, `rounded-xl` containers, `text-gray-400` secondary text
- **Infra**: Docker Compose for local dev, health checks on DB, pgvector for vector similarity search

## Security Requirements

- JWT Bearer authentication (C# API) with issuer/audience/lifetime validation
- API Key authentication for login endpoint
- Rate limiting: `IdentifyPolicy` — 10 requests/second
- CORS restricted to `http://localhost:3000`
- SSE stream auth via token in query string
- 401 responses → frontend auto-redirects to `/login`
- Circuit breaker for AI backend calls (5 failure threshold, 30s reset)
- File upload validation: extension check (+ path traversal guard)
- Input validation via Pydantic/C# records/anonymous types

## 📂 Codebase References

| Pattern | Implementation |
|---------|---------------|
| Python FastAPI routes | `gate_vision_ai/routes.py` — route registration, Pydantic models |
| C# Minimal API endpoints | `GateVision.Api/Endpoints/PersonEndpoints.cs`, `Program.cs` |
| Frontend components | `dashboard/src/components/StatCard.tsx`, `EventRow.tsx` |
| API client layer | `dashboard/src/lib/api.ts` — fetch wrapper, typed interfaces |
| Python config | `gate_vision_ai/config.py` — Pydantic BaseSettings with `GV_` prefix |
| AI pipeline | `gate_vision_ai/main.py` — FastAPI app, lifespan, capture loop |
| Docker setup | `docker-compose.yml` — pgvector + Redis with health checks |
| Frontend layout | `dashboard/src/app/layout.tsx` — root layout, providers |

## Related Files

- `business-domain.md` — Business context and problem statement
- `business-tech-bridge.md` — Business to technical mapping
- `decisions-log.md` — Major decision history
- `living-notes.md` — Active issues and open questions
