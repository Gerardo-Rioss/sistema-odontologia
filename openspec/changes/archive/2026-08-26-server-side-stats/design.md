# Design: Server-Side Statistics Aggregation

## Technical Approach

Move all 9 dashboard statistics metrics from client-side computation (9 `useMemo` + full data fetch) to a server-side pipeline: Prisma aggregate queries → service layer (label mapping, trend computation) → API endpoint → React Query hook. The exported `StatisticsReturn` interface stays identical — zero breaking changes to consumers.

## Architecture Decisions

### Decision: Repository + Service + API layer

**Choice**: Create `StatisticsRepository` (Prisma queries) + `StatisticsService` (business logic) + update existing API route
**Alternatives considered**: Inline Prisma in route handler (simpler but breaks repository pattern); raw SQL via `$queryRaw` (more flexible but harder to maintain)
**Rationale**: Matches existing codebase conventions (AppointmentRepository + AppointmentService). Keeps framework-independent business logic testable without Next.js.

### Decision: Single endpoint returning full StatisticsReturn shape

**Choice**: GET `/api/statistics/overview` returns all 7 chart datasets + overview in one response
**Alternatives considered**: Split into multiple endpoints (overview, charts, trends) for partial loading
**Rationale**: Dashboard always needs all 9 metrics simultaneously. One request reduces latency and simplifies the hook. React Query caches the full payload — no partial loading benefit.

### Decision: Server-side month labels with Spanish locale

**Choice**: Service generates Spanish month labels ("Ene 2026") from `YYYY-MM` keys using `Intl.DateTimeFormat`
**Alternatives considered**: Return raw `YYYY-MM` keys, let client format
**Rationale**: Keeps hook simple (no date-fns dependency for formatting). Labels are display-only — server knows the locale. Avoids duplicating locale logic.

### Decision: newVsReturning via GROUP BY + HAVING

**Choice**: `prisma.appointment.groupBy` on `patientId` with `HAVING COUNT(*) = 1` for new patients
**Alternatives considered**: Fetch all patient IDs and count in service layer
**Rationale**: Single SQL query. Matches current client-side logic exactly (new = exactly 1 appointment in period). Prisma's `groupBy` supports `_count` aggregation.

## Data Flow

```
Browser                    API Server                 Database
  │                          │                          │
  │  GET /api/statistics/    │                          │
  │  overview                │                          │
  │ ────────────────────────► │                          │
  │                          │  auth() → userId         │
  │                          │ ────────────────────────► │
  │                          │                          │
  │                          │  StatisticsService       │
  │                          │  .getOverview(userId)     │
  │                          │     │                    │
  │                          │     ├─► Repository       │
  │                          │     │   .getCounts()     │──► 4x COUNT
  │                          │     │   .getByMonth()    │──► GROUP BY
  │                          │     │   .getByType()     │──► GROUP BY
  │                          │     │   .getByStatus()   │──► GROUP BY
  │                          │     │   .getNewVsReturning()──► GROUP BY + HAVING
  │                          │     │                    │
  │                          │  transform:              │
  │                          │    - label mapping       │
  │                          │    - month formatting    │
  │                          │    - completion trend    │
  │                          │    - cancellation rate   │
  │                          │                          │
  │  { overview, charts,    │◄───────────────────────── │
  │    trends, rates }      │                          │
  │ ◄──────────────────────── │                          │
  │                          │                          │
  │  useQuery → cache 30s    │                          │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/repositories/statistics.repository.ts` | Create | Prisma aggregate/groupBy queries scoped by userId, 12-month window |
| `src/services/statistics.service.ts` | Create | Business logic: label mapping, month labels, completionTrend, cancellationRate, newVsReturning |
| `src/app/api/statistics/overview/route.ts` | Modify | Replace hardcoded zeros with `statisticsService.getOverview(userId)` via `withAuth` |
| `src/hooks/useStatistics.ts` | Modify | Replace 9 useMemo with single `useQuery` fetch, same return shape |
| `src/services/types.ts` | Modify | Add `IStatisticsRepository` interface |

## Interfaces / Contracts

### Repository return types

```typescript
// Raw Prisma results (internal to repository)
interface AppointmentMonthGroup {
  month: string; // "YYYY-MM" from Prisma
  _count: { id: number };
}

interface AppointmentTypeGroup {
  type: AppointmentType;
  _count: { id: number };
}

interface AppointmentStatusGroup {
  status: AppointmentStatus;
  _count: { id: number };
}

interface PatientAppointmentCount {
  patientId: string;
  _count: { id: number };
}
```

### Service interface

```typescript
// src/services/statistics.service.ts
export class StatisticsService {
  constructor(private readonly statsRepo: IStatisticsRepository) {}
  async getOverview(userId: string): Promise<StatisticsReturn>
}

// StatisticsReturn matches existing hook interface exactly:
// { overview, appointmentsByMonth, byType, byStatus, completionTrend,
//   cancellationRate, newVsReturning, isLoading: false, error: null }
```

### Repository interface (added to types.ts)

```typescript
export interface IStatisticsRepository {
  getCounts(userId: string, cutoff: Date, today: Date): Promise<{
    totalAppointments: number;
    appointmentsToday: number;
    completedCount: number;
  }>;
  getTotalPatients(userId: string): Promise<number>;
  getByMonth(userId: string, cutoff: Date): Promise<{ month: string; count: number }[]>;
  getByType(userId: string, cutoff: Date): Promise<{ type: string; count: number }[]>;
  getByStatus(userId: string, cutoff: Date): Promise<{ status: string; count: number }[]>;
  getPatientAppointmentCounts(userId: string, cutoff: Date): Promise<{ patientId: string; count: number }[]>;
}
```

### API response

```typescript
// GET /api/statistics/overview
// 200: { success: true, data: StatisticsReturn }
// 401: { error: "No autenticado" }
```

## Timezone Handling

Follows the same UTC pattern as `src/lib/formatters.ts`:
- PostgreSQL `@db.Date` serializes as midnight UTC
- Service uses `date-fns` `subMonths(new Date(), 12)` for cutoff (same as current hook)
- Month grouping: Prisma `gte` filter on `date` column. Grouping done in service via `toISOString().slice(0, 7)` to extract `YYYY-MM` — matches existing `dateKeyOf` pattern but on server side
- Spanish labels: `Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' })` via `toDateOnly` helper to avoid timezone shift

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | StatisticsRepository queries return correct shapes | Mock Prisma, verify query args (userId, date filters) |
| Unit | StatisticsService transforms raw data to StatisticsReturn | Mock repository, verify label mapping, month formatting, rate computation |
| Unit | useStatistics hook calls useQuery with correct endpoint | Mock fetch, verify return shape matches StatisticsReturn |
| Integration | GET /api/statistics/overview returns 200 with auth | Supertest with mocked auth session |
| Integration | GET /api/statistics/overview returns 401 without auth | Supertest without session |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required — zero schema changes. The existing API route already exists (returns hardcoded zeros). The hook already imports from `/api/statistics/overview`. Rollout is a code-only swap:

1. Deploy repository + service (no consumers yet)
2. Update API route to use service (replaces dead code)
3. Update hook to use `useQuery` (same interface, zero breaking changes)

Rollback: revert hook to previous `useMemo` version. API route reverts to hardcoded zeros (was already dead code).

## Open Questions

- [ ] Should `staleTime` be configurable per-user or stay at fixed 30s?
- [ ] If Prisma `groupBy` month extraction proves unreliable with `@db.Date`, fall back to `$queryRaw` with `to_char(date, 'YYYY-MM')` — risk medium, mitigation documented.
