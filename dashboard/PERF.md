# Dashboard performance baseline

Metrics captured after refactor (2026-06-22).

## Bundle (next build)

Run: `npm run build` from `dashboard/`

| Route | First Load JS (target: reduced vs monolithic pages) |
|-------|------------------------------------------------------|
| /dashboard | client page + extracted components |
| /gates/[id] | ~150 line shell + lazy section chunks |

Run analyzer: `npm run analyze`

## Network optimizations applied

- `fetchPersonIds()` replaces `fetchPersons(200)` on dashboard
- SSE active: polling disabled on events/access-log (60s fallback when disconnected)
- MJPEG: max 1 stream per focused view; overview uses click-to-preview

## Playwright

```bash
npm run test:perf
npm run test:stress
```

Thresholds:
- Login DOM ready < 5s
- Gate focus click < 500ms
- Stream imgs on overview ≤ 1

## Lighthouse CI

```bash
npm run build && npm run start
npm run lighthouse
```

Targets: performance ≥ 70, accessibility ≥ 90

## Component extraction summary

| Before | After |
|--------|-------|
| gates/[id]/page.tsx ~784 lines | ~170 line shell + 8 components + useGateDetail |
| dashboard/page.tsx ~408 lines | ~150 lines + 4 components + useDashboardEvents |
| access-log/page.tsx ~429 lines | ~220 lines + ValidatedRow + StatsCards |
| gates/page.tsx manual polling | React Query + GateCard component |
