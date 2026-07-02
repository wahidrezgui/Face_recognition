# ADR 001: Gate Modular Monolith Refactor

## Status

Accepted

## Context

The gate application is a Laravel 10 + Vue 3 SPA for military gate pass check-in/out. It currently uses a single ~7,000-line `ApiController`, unauthenticated API routes, and client-only role checks via `localStorage`. Multiple duplicate assets (TinyMCE) and legacy file copies exist.

## Decision

Refactor into a **modular monolith** with:

1. **Sanctum SPA authentication** — session cookies + CSRF for same-origin WAMP deployment
2. **RESTful API** — domain-grouped routes under `/api/{domain}/...`
3. **Layered backend** — Controllers → Services → Models (SRP, DRY)
4. **Structured Vue frontend** — `api/`, `composables/`, `pages/`, `router/guards.js`
5. **Strangler migration** — extract one domain at a time; delete god-class when empty (completed: `GateLegacyService` → domain services under `app/Services/{Domain}/`)

## Database ownership

- **`gateprod`** is owned by the gate app (writes: employees, movements, departments)
- **gymapp** and **haderweb** read from `gateprod`; they do not call gate API endpoints

## Backend service layout

```
app/Services/
├── AuthService.php
├── EmployeeSearchService.php
├── Movements/MovementCheckService.php
├── Lookups/LookupService.php
├── Organization/OrganizationService.php
├── Employees/{EmployeeService,CheckTimeService}.php
├── Users/UserAdminService.php
├── Stats/StatsService.php
└── Reports/{ReportQueryService,IssueDetectionService}.php

app/Support/Tree/{DepartmentTreeService,RankTreeService,BaseTreeService}.php
```

Controllers in `app/Http/Controllers/Api/` are thin; they delegate to the service above for their domain.

## Consequences

- Positive: testable services, server-enforced auth, maintainable frontend
- Negative: large one-time refactor; all Vue pages must migrate API URLs per domain
- Neutral: same deployment model (WAMP → `gate/backend/public`)

## References

- Refactor plan: Gate App Refactor Plan (phases 0–7)
- Smoke checklist: `gate/docs/smoke-test-checklist.md`
