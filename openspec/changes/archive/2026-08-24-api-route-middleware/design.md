# Design: API Route Middleware

## Technical Approach

Create a single `src/lib/api-middleware.ts` module exporting two functions:

1. **`withAuth(handler, options?)`** — HOF that wraps Next.js App Router handlers with the NextAuth `auth()` guard. Delegates thrown errors to `handleServiceError()`.
2. **`handleServiceError(error)`** — Pure function that maps service-layer errors to typed HTTP responses using message pattern matching.

Refactor all 9 route files (18 handler exports) to use these functions, eliminating ~600 lines of duplicated auth boilerplate and error catch blocks.

## Architecture Decisions

### Decision: `withAuth` Signature

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A — Minimal: `withAuth(handler)` | Simpler, no extensibility | Rejected |
| B — With options: `withAuth(handler, { roles? })` | Extensible for future RBAC, no cost today | **Chosen** |

**Rationale**: The `whatsapp/send` route already has role-based auth. Adding `roles?: string[]` now costs nothing and prevents a second refactor when role enforcement moves to middleware. `roles` defaults to `undefined` (no enforcement).

### Decision: Error Delegation Inside `withAuth`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A — `withAuth` only does auth, handler catches errors | Keeps withAuth pure, handlers still have try/catch | Rejected |
| B — `withAuth` wraps handler + delegates to `handleServiceError` | Single try/catch, zero error boilerplate in handlers | **Chosen** |

**Rationale**: The whole point is eliminating error catch blocks from handlers. The spec requires this. Handlers become pure business logic.

### Decision: Session Type Import

Import `Session` directly from `next-auth`. The project already augments it in `src/types/next-auth.d.ts` adding `user.id: string` and `user.role?: string`. No local type needed.

### Decision: Error Message Patterns

Order of matching in `handleServiceError` (first match wins):

| Priority | Pattern | HTTP Status | Used In |
|----------|---------|-------------|---------|
| 1 | `instanceof ZodError` | 400 | appointments POST/PUT, patients POST, patients/[id] PUT |
| 2 | message includes `"no encontrado"` | 404 | all `[id]` routes, medical-record, attachments |
| 3 | message includes `"No tiene permiso"` | 403 | all `[id]` routes, medical-record, attachments |
| 4 | message includes `"Conflicto de horario"` OR `"pendientes"` OR `"cancelada"` | 409 | appointments POST/PUT, confirm, cancel |
| 5 | fallback | 500 | all routes |

This covers every error pattern found across all 9 route files. The medical-record PUT route currently lacks ZodError handling — `handleServiceError` fixes this automatically (improvement, not regression).

## Data Flow

```
Client Request
     │
     ▼
withAuth(handler)
     │
     ├── auth() returns null/undefined → 401 JSON
     │
     └── auth() returns session
           │
           ▼
     handler(request, { session, params })
           │
           ├── success → handler's NextResponse
           │
           └── throws error
                 │
                 ▼
           handleServiceError(error)
                 │
                 ├── ZodError → 400 + field details
                 ├── "no encontrado" → 404
                 ├── "No tiene permiso" → 403
                 ├── conflict patterns → 409
                 └── fallback → 500
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/api-middleware.ts` | Create | `withAuth()` HOF and `handleServiceError()` function |
| `src/app/api/appointments/route.ts` | Modify | Wrap GET/POST with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/appointments/[id]/route.ts` | Modify | Wrap GET/PUT/DELETE with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/appointments/[id]/confirm/route.ts` | Modify | Wrap PATCH with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/appointments/[id]/cancel/route.ts` | Modify | Wrap PATCH with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/patients/route.ts` | Modify | Wrap GET/POST with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/patients/[id]/route.ts` | Modify | Wrap GET/PUT/DELETE with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/patients/[id]/medical-record/route.ts` | Modify | Wrap GET/PUT with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/patients/[id]/attachments/route.ts` | Modify | Wrap GET/POST with `withAuth`, use `handleServiceError` in catch |
| `src/app/api/settings/route.ts` | Modify | Wrap GET/PUT with `withAuth`, use `handleServiceError` in catch |
| `tests/unit/api-middleware.test.ts` | Create | Unit tests for `withAuth` and `handleServiceError` |

## Interfaces / Contracts

```typescript
// src/lib/api-middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { Session } from "next-auth";
import { ZodError } from "zod";

type RouteContext = { params?: Record<string, string> };

type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: Session } & RouteContext
) => Promise<NextResponse>;

type RawHandler = (
  request: NextRequest,
  context?: RouteContext
) => Promise<NextResponse>;

interface WithAuthOptions {
  roles?: string[];
}

export function withAuth(
  handler: AuthenticatedHandler,
  options?: WithAuthOptions
): RawHandler;

export function handleServiceError(error: unknown): NextResponse;
```

**Key design details for `withAuth`:**
- Calls `auth()` to get session
- Returns 401 with `{ error: "No autenticado" }` if `!session?.user?.id`
- If `options.roles` is provided, checks `session.user.role` against the list; returns 403 on mismatch
- Wraps handler call in try/catch, delegates to `handleServiceError`
- Forwards `params` from the second argument (Next.js dynamic route context)

**Key design details for `handleServiceError`:**
- Logs via `console.error` before returning (preserves existing behavior)
- ZodError check first (most specific type)
- String matching on `error.message` for 404/403/409 patterns
- Fallback to 500

## Refactoring Pattern

Before (example from `appointments/[id]/route.ts` GET):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const appointment = await appointmentService.getById(params.id, session.user.id);
    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Cita no encontrada") { ... }
      if (error.message.includes("No tiene permiso")) { ... }
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

After:
```typescript
export const GET = withAuth(async (request, { session, params }) => {
  const appointment = await appointmentService.getById(params.id, session.user.id);
  return NextResponse.json({ success: true, data: appointment });
});
```

**Settings route special case**: Returns flat objects (not `{ success, data }`). `withAuth` wraps the export but the handler still returns whatever it returns. No conflict — `withAuth` doesn't shape the response, only handles auth + error delegation.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `withAuth` — auth() returns null → 401 | Mock `@/lib/auth`, assert NextResponse.json with 401 |
| Unit | `withAuth` — session.user.id missing → 401 | Same mock, session without id |
| Unit | `withAuth` — valid session → handler called with session | Spy on handler, verify called with session object |
| Unit | `withAuth` — handler throws → handleServiceError called | Mock handler to throw, verify delegation |
| Unit | `withAuth` — params forwarded | Verify handler receives params from context |
| Unit | `withAuth` — roles option → 403 on mismatch | Set options.roles, mock session with different role |
| Unit | `handleServiceError` — ZodError → 400 | Create ZodError instance, assert 400 + details |
| Unit | `handleServiceError` — "no encontrado" → 404 | Error with matching message, assert 404 |
| Unit | `handleServiceError` — "No tiene permiso" → 403 | Assert 403 |
| Unit | `handleServiceError` — "Conflicto de horario" → 409 | Assert 409 |
| Unit | `handleServiceError` — "pendientes" → 409 | Assert 409 |
| Unit | `handleServiceError` — "cancelada" → 409 | Assert 409 |
| Unit | `handleServiceError` — unknown error → 500 | Assert 500 |
| Unit | `handleServiceError` — console.error called | Spy on console.error, verify called |
| Integration | All 372 existing tests pass | `npm test` — no behavior change |

Test file location: `tests/unit/api-middleware.test.ts` (unit project, node environment).
Mock strategy: `jest.mock("@/lib/auth")` to control `auth()` return value.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. This is a pure refactor — no database changes, no schema changes, no API contract changes. The middleware wraps existing behavior.

Rollback: `git checkout HEAD~1 -- src/app/api/ src/lib/api-middleware.ts tests/unit/api-middleware.test.ts`

## Open Questions

None — the proposal, spec, and codebase analysis provide sufficient clarity for implementation.
