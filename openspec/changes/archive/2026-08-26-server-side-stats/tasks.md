# Tasks: Server-Side Statistics Aggregation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Repository + Service + API + Hook | PR 1 | `npm test -- --testPathPattern=statistics` | `npm run dev` → `/dashboard/statistics` | Delete new files, revert hook, revert route |

## Phase 1: Foundation

- [x] 1.1 Add `IStatisticsRepository` interface to `src/services/types.ts` with methods: `getCounts`, `getTotalPatients`, `getByMonth`, `getByType`, `getByStatus`, `getPatientAppointmentCounts`
- [x] 1.2 Create `src/repositories/statistics.repository.ts` implementing `IStatisticsRepository` — Prisma `aggregate` for counts, `groupBy` for month/type/status/patient splits; all scoped by `userId`, 12-month cutoff via `gte` filter on `date` column

## Phase 2: Service Layer

- [x] 2.1 Create `src/services/statistics.service.ts` — `StatisticsService` class with `getOverview(userId)` method that calls repository, transforms raw output to `StatisticsReturn` shape: applies TYPE_LABELS/STATUS_LABELS, generates 12-month Spanish labels via `Intl.DateTimeFormat`, computes completionRate/cancellationRate/newVsReturning
- [x] 2.2 Export singleton `statisticsService` instance wired to real repository (pattern: `appointment.service.ts`)

## Phase 3: API + Client Wiring

- [x] 3.1 Update `src/app/api/statistics/overview/route.ts` — import `withAuth` (or extract userId from session), call `statisticsService.getOverview(userId)`, return JSON with success/data shape; add 401 guard for missing session; add try/catch returning 500 on unexpected errors
- [x] 3.2 Rewrite `src/hooks/useStatistics.ts` — replace all `useMemo` logic + `useAppointments`/`usePatients` calls with `useQuery` to `GET /api/statistics/overview`; return same `StatisticsReturn` interface (isLoading from useQuery, error state); remove `date-fns`/`dateKeyOf` dependencies

## Phase 4: Testing

- [x] 4.1 Create `tests/unit/services/statistics.service.test.ts` — mock `IStatisticsRepository`, verify: getOverview returns complete StatisticsReturn shape; label mappings (LIMPIEZA→"Limpieza", COMPLETED→"Completada"); 12-month array with zero-fill; completionRate/cancellationRate math; newVsReturning split
- [x] 4.2 Create `tests/unit/repositories/statistics.repository.test.ts` — mock Prisma client, verify: queries scoped by userId; date filter uses 12-month cutoff; groupBy returns correct shapes; empty data returns zeroed defaults
- [x] 4.3 Update `tests/integration/useStatistics.test.ts` — mock `/api/statistics/overview` fetch, verify hook returns StatisticsReturn shape; verify isLoading/error states; verify no useAppointments call inside hook
- [x] 4.4 Run full test suite: `npm test` — confirm 372+ tests pass, no regressions

## Phase 5: Cleanup

- [x] 5.1 Verify `useAppointments` is no longer called inside `useStatistics` (was called twice per page load)
- [x] 5.2 Run `npm run type-check` and `npm run build` — confirm zero TypeScript errors
