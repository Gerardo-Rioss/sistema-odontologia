# Design: Admin Global Reports

## Technical Approach

Extend the existing repository/service pipeline with global (cross-user) query methods, expose them through ADMIN-guarded API routes, render them in a new admin dashboard, and provide printable PDF reports via a print-optimized page + `window.print()` (no heavy PDF dependency).

## Architecture Decisions

### Decision: `withRole` guard wrapping `withAuth`

**Choice**: Add a `withRole("ADMIN")` higher-order middleware that wraps `withAuth` and returns 403 for non-ADMIN sessions.
**Alternatives considered**: Inline role checks in each route (duplicated logic); NextAuth `authorized` callback (route-level only, doesn't protect server logic).
**Rationale**: Single reusable guard matching the existing `withAuth` middleware pattern; DENTIST behavior stays unchanged because existing routes are never wrapped with `withRole`.

### Decision: Extend StatisticsRepository/Service with global methods

**Choice**: Add `getGlobalOverview()`, `getByUser()`, `getTimeline(from, to)` to the existing repository/service. Same Prisma `aggregate`/`groupBy` patterns; omit the `userId` filter and `groupBy` user where the comparison needs per-user rows.
**Alternatives considered**: A separate `GlobalStatisticsService` (duplicates label mapping and trend logic); raw SQL via `$queryRaw` (more flexible but harder to maintain).
**Rationale**: Reuses proven patterns, Spanish locale labels, and trend computation; one service keeps tests simple.

### Decision: Three global endpoints

- `GET /api/statistics/global/overview` — KPIs across all users
- `GET /api/statistics/global/by-user` — per-user comparison rows
- `GET /api/statistics/global/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD` — monthly series in range

All wrapped with `withRole("ADMIN")`.

### Decision: PDF via print-optimized view

**Choice**: Dedicated printable report pages + print CSS (A4) + `window.print()`; the user saves as PDF from the browser dialog.
**Alternatives considered**: Server-side PDF generation (puppeteer / PDF libs — heavy, fragile on Vercel serverless); `react-to-print`.
**Rationale**: Zero new dependencies, works on Vercel, trivially testable, and "Save as PDF" is a native browser feature.

### Decision: Finances deferred

**Choice**: No new Prisma models in this change. Financial reports require a future SDD with treatment/payment/invoice models.
**Rationale**: Explicit user decision — activity first, finances later (F4).

## Data Flow

```
Dashboard /dashboard/admin  →  useGlobalStatistics hook  →  /api/statistics/global/* (withRole ADMIN)
                                                                  ↓
                                               StatisticsService.getGlobal*()
                                                                  ↓
                                               StatisticsRepository (Prisma aggregate/groupBy, no userId filter)
```

Report pages reuse the same service methods with `from`/`to` range parameters.
