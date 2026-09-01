# Proposal: Admin Global Reports

## Intent

The system has two roles (`ADMIN`, `DENTIST`) and all data is scoped by `userId` for multi-tenant isolation. Today the ADMIN user only sees their own patients/appointments: `/api/statistics/overview` and `/dashboard/statistics` are always scoped to `session.user.id`. There is no way to view global data across both users, run cross-user calculations, or export reports.

This change adds an ADMIN-only global view: KPIs aggregated across all users, a side-by-side per-user comparison, date-range filtering, and printable PDF reports. The DENTIST experience is untouched.

## Scope

### In Scope

- `withRole("ADMIN")` authorization guard reusing the existing `withAuth` middleware
- Global statistics endpoints under `/api/statistics/global/*` (overview, by-user, timeline with date filters)
- New repository/service methods that aggregate across users, reusing existing Prisma patterns
- Admin dashboard page `/dashboard/admin` with global StatsCards + per-user comparison table
- Printable PDF reports (print-optimized view) for: activity per period, new vs returning patients, productivity per dentist
- Unit tests for guard, repository, and service

### Out of Scope

- Financial reports (incomes/payments) — future change, requires new Prisma models
- Changes to DENTIST-visible pages or behavior
- Report history persistence (optional `Report` model deferred)
- Scheduled/emailed reports
- Caching layer

## Capabilities

### New Capabilities

- `admin-global-reports`: ADMIN-only global statistics across all users + printable PDF reports

### Modified Capabilities

None. `statistics-server-side` keeps its userId-scoped contract unchanged; the global methods are additive on the same repository/service classes.

## Approach

1. Add a reusable `withRole(role)` guard that wraps `withAuth` and returns 403 for unauthorized roles.
2. Extend `StatisticsRepository` with global query methods (no `userId` filter; `groupBy` user for the comparison) and `StatisticsService` with `getGlobalOverview()`, `getByUser()`, `getTimeline(from, to)`.
3. Expose three ADMIN-guarded endpoints: `/api/statistics/global/overview`, `/api/statistics/global/by-user`, `/api/statistics/global/timeline?from&to`.
4. Build `/dashboard/admin` reusing StatsCard + Recharts patterns, with a per-user comparison table and date-range filter.
5. Add print-optimized report pages (activity, new vs returning, productivity) exported as PDF via the browser print dialog — zero heavy dependencies, serverless-friendly.
6. Finances deferred to a future change (F4).
