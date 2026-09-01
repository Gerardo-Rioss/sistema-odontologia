# Proposal: Extract Shared API Route Middleware

## Intent

18+ API route handlers repeat identical boilerplate: a 4-line auth guard block copy-pasted in every handler, and 5-18 line error catch blocks that string-match on Spanish error messages. This produces ~600+ lines of near-identical code, makes error handling fragile (a message typo breaks mapping), and forces every new route to re-implement the same pattern. Extracting shared middleware eliminates this duplication and creates a single point of control for auth and error handling.

## Scope

### In Scope

- Create `src/lib/api-middleware.ts` with:
  - `withAuth(handler)` — higher-order function that runs the auth guard, passes `session` to handler, returns 401 on failure
  - `handleServiceError(error)` — maps service-layer errors to typed HTTP responses using message pattern matching
- Refactor all 9 route files to use the new middleware functions
- Add unit tests for both middleware functions

### Out of Scope

- No changes to the service layer error throwing pattern (no typed error classes)
- No response shape standardization (settings route stays as-is with flat objects)
- No role-based auth expansion (whatsapp/send route keeps its existing RBAC)
- No changes to auth library (`src/lib/auth.ts`)

## Capabilities

### New Capabilities

- `api-middleware`: Shared higher-order functions for API route auth guards and service error-to-HTTP mapping

### Modified Capabilities

None — this is a pure refactor that doesn't change external API behavior.

## Approach

1. Create `withAuth(handler)` HOF that wraps any route handler with the auth guard, extracting the 4-line `auth()` + null-check pattern. Handler receives `(request, context, session)`.
2. Create `handleServiceError(error)` that matches error messages in priority order: ZodError → "no encontrado" → "No tiene permiso" → "Conflicto de horario"/"pendientes"/"cancelada" → fallback 500. Returns a `NextResponse`.
3. Refactor each route file by wrapping exports with `withAuth` and replacing catch blocks with `handleServiceError`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/api-middleware.ts` | New | Middleware HOFs and error mapper |
| `src/app/api/appointments/route.ts` | Modified | Wrap GET/POST with withAuth, use handleServiceError |
| `src/app/api/appointments/[id]/route.ts` | Modified | Wrap GET/PUT/DELETE with withAuth, use handleServiceError |
| `src/app/api/appointments/[id]/confirm/route.ts` | Modified | Wrap PATCH with withAuth, use handleServiceError |
| `src/app/api/appointments/[id]/cancel/route.ts` | Modified | Wrap PATCH with withAuth, use handleServiceError |
| `src/app/api/patients/route.ts` | Modified | Wrap GET/POST with withAuth, use handleServiceError |
| `src/app/api/patients/[id]/route.ts` | Modified | Wrap GET/PUT/DELETE with withAuth, use handleServiceError |
| `src/app/api/patients/[id]/medical-record/route.ts` | Modified | Wrap GET/PUT with withAuth, use handleServiceError |
| `src/app/api/patients/[id]/attachments/route.ts` | Modified | Wrap GET/POST with withAuth, use handleServiceError |
| `src/app/api/settings/route.ts` | Modified | Wrap GET/PUT with withAuth, use handleServiceError |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| withAuth signature mismatch with route params typing | Low | Keep handler signature generic, test with Next.js 14 App Router types |
| Subtle behavioral change in error responses | Low | Verify all error message patterns match existing catch blocks exactly |

## Rollback Plan

Revert all route files to their pre-change versions via `git checkout HEAD~1 -- src/app/api/` and delete `src/lib/api-middleware.ts`. No schema or data changes to undo.

## Dependencies

None — pure refactor within existing codebase.

## Success Criteria

- [ ] All 9 route files use `withAuth` and `handleServiceError`
- [ ] Zero `auth()` null-check blocks remain in route handlers
- [ ] Zero manual error message matching in route handlers
- [ ] All existing tests pass without modification
- [ ] New unit tests cover withAuth (authorized/unauthorized) and handleServiceError (all error types)
- [ ] No behavioral change in API responses
