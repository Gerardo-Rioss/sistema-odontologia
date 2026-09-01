# Tasks: Admin Global Reports

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | 3 PRs (API / Dashboard / Reports) |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | `withRole` guard + global repository/service methods + 3 endpoints | PR 1 | `npm test -- --testPathPattern=statistics` | `npm run dev` → `/api/statistics/global/overview` (ADMIN) | Delete new files, revert routes |
| 2 | Admin dashboard + comparison table + date filter | PR 2 | `npm test -- --testPathPattern=dashboard` | `/dashboard/admin` | Revert page + hook |
| 3 | Printable PDF report pages | PR 3 | `npm test -- --testPathPattern=reports` | `/dashboard/admin/reports/activity` | Revert report pages |

## Phase 1: Authorization & Global API

- [ ] 1.1 Add `withRole(role)` middleware in `src/lib/api-middleware` wrapping `withAuth`, 403 for non-ADMIN
- [ ] 1.2 Add global query methods to `StatisticsRepository` (`getGlobalOverview`, `getByUser`, `getTimeline(from, to)` — no `userId` filter, `groupBy` user where needed)
- [ ] 1.3 Add global orchestration methods to `StatisticsService` reusing label mapping / trend logic
- [ ] 1.4 Create routes: `/api/statistics/global/overview`, `/api/statistics/global/by-user`, `/api/statistics/global/timeline` — all wrapped with `withRole("ADMIN")`
- [ ] 1.5 Unit tests: guard (DENTIST → 403, ADMIN → 200), aggregation across users, empty data

## Phase 2: Admin Dashboard

- [ ] 2.1 Create `/dashboard/admin` layout with role gate (non-ADMIN → redirect/403 message)
- [ ] 2.2 Global StatsCards + Recharts (reuse `ChartsSection` dynamic-import pattern)
- [ ] 2.3 Per-user comparison table (patients, appointments, completed, cancellation rate per user)
- [ ] 2.4 Date-range filter (from/to) wired to `timeline` endpoint
- [ ] 2.5 `useGlobalStatistics` hook (React Query) + loading/empty/error states

## Phase 3: Printable PDF Reports

- [ ] 3.1 Report data endpoints or query params reusing global service with `from`/`to`
- [ ] 3.2 Printable pages: activity per period, new vs returning patients, productivity per dentist
- [ ] 3.3 Print CSS (A4, headers with range + clinic name, table styles)
- [ ] 3.4 Links from admin dashboard + "Imprimir / Guardar PDF" button (`window.print()`)
- [ ] 3.5 Tests for report data computation

## Phase 4: Future (out of scope)

- [ ] ⏳ Financial reports: Prisma models (treatment/payment/invoice), income calculations
