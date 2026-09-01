# Tasks: Extract Shared API Route Middleware

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200-300 net (60 new middleware + 120 tests - 200+ deleted boilerplate) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Create api-middleware.ts + unit tests | PR 1 | `npm test -- tests/unit/api-middleware.test.ts` | `npm run dev` | src/lib/api-middleware.ts, tests/unit/api-middleware.test.ts |
| 2 | Refactor 9 route files to use withAuth | PR 1 | `npm test` | `npm run dev` | src/app/api/ routes revert via git |

## Phase 1: Test Infrastructure (RED)

- [x] 1.1 Create `tests/unit/api-middleware.test.ts` with 14 test cases for `withAuth`: auth success → handler called with session, no session → 401, no user.id → 401, params forwarded, handler error → handleServiceError called, roles check → 403
- [x] 1.2 Add test cases for `handleServiceError`: ZodError → 400 with details, "no encontrado" → 404, "No tiene permiso" → 403, "Conflicto de horario" → 409, "pendientes" → 409, "cancelada" → 409, unknown → 500, console.error called
- [x] 1.3 Mock `@/lib/auth` for auth() control, verify all 14 tests fail (RED)

## Phase 2: Implementation (GREEN)

- [x] 2.1 Create `src/lib/api-middleware.ts` with `withAuth(handler, options?)` HOF: calls auth(), returns 401 if no session/user.id, checks roles if provided, wraps handler in try/catch delegating to handleServiceError
- [x] 2.2 Implement `handleServiceError(error: unknown)` → ZodError check → string match "no encontrado"/"no encontrada" → "No tiene permiso" → conflict patterns → fallback 500, console.error before return
- [x] 2.3 Run `npm test -- tests/unit/api-middleware.test.ts` — all 14 tests pass (GREEN)

## Phase 3: Route Refactoring

- [x] 3.1 Refactor `src/app/api/appointments/route.ts` (GET, POST) — wrap with withAuth, replace catch blocks with handleServiceError
- [x] 3.2 Refactor `src/app/api/appointments/[id]/route.ts` (GET, PUT, DELETE) — same pattern
- [x] 3.3 Refactor `src/app/api/appointments/[id]/confirm/route.ts` (PATCH) — wrap with withAuth, use handleServiceError
- [x] 3.4 Refactor `src/app/api/appointments/[id]/cancel/route.ts` (PATCH) — wrap with withAuth, use handleServiceError
- [x] 3.5 Refactor `src/app/api/patients/route.ts` (GET, POST) — wrap with withAuth, replace catch blocks with handleServiceError
- [x] 3.6 Refactor `src/app/api/patients/[id]/route.ts` (GET, PUT, DELETE) — same pattern
- [x] 3.7 Refactor `src/app/api/patients/[id]/medical-record/route.ts` (GET, PUT) — wrap with withAuth, use handleServiceError
- [x] 3.8 Refactor `src/app/api/patients/[id]/attachments/route.ts` (GET, POST) — wrap with withAuth, use handleServiceError
- [x] 3.9 Refactor `src/app/api/settings/route.ts` (GET, PUT) — wrap with withAuth, use handleServiceError

## Phase 4: Verification

- [x] 4.1 Run `npm test` — all 372+ tests pass (14 new + existing)
- [x] 4.2 Run `npm run type-check` — zero TypeScript errors (1 pre-existing in components.test.tsx)
