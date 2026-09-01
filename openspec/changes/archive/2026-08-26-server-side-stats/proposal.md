# Proposal: Server-Side Statistics Aggregation

## Intent

`useStatistics` (238 lines) fetches ALL appointments and patients to the client, then computes 9 metrics via useMemo. The API endpoint `/api/statistics/overview` is dead code (returns hardcoded zeros). Won't scale past a few hundred records. 9 useMemo filters + 24 per-month iterations waste client CPU. `useAppointments` is called twice (inside useStatistics + page).

## Scope

### In Scope
- `src/repositories/statistics.repository.ts` — Prisma aggregate/groupBy queries for all 9 metrics
- `src/services/statistics.service.ts` — business logic (month labels, type/status labels, new-vs-returning classification)
- `src/app/api/statistics/overview/route.ts` — replace hardcoded zeros with real data via StatisticsService
- `src/hooks/useStatistics.ts` — rewrite to fetch from `/api/statistics/overview` instead of computing client-side
- Unit tests for repository, service, and updated hook

### Out of Scope
- Server Component conversion for dashboard page
- Dashboard page layout changes
- StatsCard / AppointmentList component changes
- Caching layer (future optimization)

## Capabilities

### New Capabilities
- `statistics-server-side`: Server-side computation of dashboard statistics via repository + service + API endpoint

### Modified Capabilities
- `dashboard-ui` (R7): Statistics requirement changes from "client-computed" to "server-computed via API". Same 9 metrics, same `StatisticsReturn` interface, different data source.

## Approach

**Repository** (`statistics.repository.ts`): Uses `prisma.appointment.groupBy` for byType, byStatus, monthly counts; `prisma.appointment.aggregate` for totals/completions; `prisma.patient.count` for patient total. All queries scoped by `userId` (multi-tenant). Date range: last 12 months via Prisma `gte` filter on `date` column (PostgreSQL `@db.Date`).

**Service** (`statistics.service.ts`): Accepts userId, calls repository, transforms raw Prisma output into the existing `StatisticsReturn` shape. Applies label mappings (TYPE_LABELS, STATUS_LABELS), generates 12-month labels, computes completionRate, cancellationRate, newVsReturning. Framework-independent.

**API route** (`/api/statistics/overview`): Gets userId from session, calls `StatisticsService.getOverview(userId)`, returns JSON with the same `StatisticsReturn` shape. Auth-guarded (401).

**Hook** (`useStatistics.ts`): Replaces all useMemo logic with `useQuery` fetch to `/api/statistics/overview`. Same exported interface — zero breaking changes to consumers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/repositories/statistics.repository.ts` | New | Prisma aggregate/groupBy queries |
| `src/services/statistics.service.ts` | New | Business logic for metric computation |
| `src/app/api/statistics/overview/route.ts` | Modified | Real data instead of hardcoded zeros |
| `src/hooks/useStatistics.ts` | Modified | Fetch from API instead of computing |
| `openspec/specs/dashboard-ui/spec.md` | Modified | R7 changes from client-computed to server-computed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prisma groupBy month extraction differs from client `dateKeyOf` | Medium | Use raw SQL `to_char(date, 'YYYY-MM')` via Prisma `$queryRaw` if needed; test with real data |
| Timezone edge cases on month boundaries | Medium | Use PostgreSQL `AT TIME ZONE` or parse date-only strings (matching existing `dateKeyOf` pattern) |
| API latency vs instant useMemo | Low | Single aggregate query; no N+1; React Query caches |

## Rollback Plan

Revert `useStatistics.ts` to previous useMemo version. Delete new files. API route reverts to hardcoded zeros (was already dead code). Zero data loss — no schema changes.

## Dependencies

- Prisma schema unchanged (Appointment.date is `@db.Date`, indexes exist on `[userId, date]` and `[status]`)
- NextAuth session available in API route (existing pattern from other routes)

## Success Criteria

- [ ] Dashboard loads statistics from API, not client computation
- [ ] `useAppointments` called once per page load (not twice)
- [ ] All 9 metrics return correct values matching current client-computed output
- [ ] Tests pass: repository queries, service transformation, hook API fetch
- [ ] Build succeeds, no TypeScript errors

## Proposal Question Round

1. **API shape**: Should `/api/statistics/overview` return the full `StatisticsReturn` shape (7 chart datasets + overview), or just the 4 overview fields? Returning all 7 keeps the hook simple; splitting endpoints adds HTTP requests but allows partial loading.

2. **Month label locale**: The current hook uses `date-fns` `format(date, 'MMM yyyy', { locale: es })` for Spanish month labels ("Ene 2026"). Should the server generate these labels, or should the API return raw `YYYY-MM` keys and let the client format labels?

3. **newVsReturning classification**: Current logic counts patients with exactly 1 appointment in the period as "new". This requires a `GROUP BY patientId HAVING COUNT(*) = 1` query. Is this acceptable, or should the threshold be different?

4. **Error handling**: If the statistics API fails, should the dashboard show a global error state, or degrade gracefully (show empty charts)?
