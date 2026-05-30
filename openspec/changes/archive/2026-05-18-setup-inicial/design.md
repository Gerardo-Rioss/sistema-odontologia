# Design: Setup Inicial — Arquitectura y Herramientas Base

## Technical Approach

Greenfield scaffolding of a monolithic Next.js 14+ (App Router) application with layered architecture: **Route Handlers → Service Layer → Repository → Prisma → PostgreSQL**. Single deployable Vercel unit — no separate backend server. This phase establishes the skeleton: directory structure, config files, Prisma schema (3 core models), Docker dev environment, and CI pipeline. All placeholders ready for Phase 2 (auth) and Phase 3 (API endpoints).

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|---|---|---|---|
| **Monolith vs split BE/FE** | Monorepo with Next.js API Routes | Separate Express server | Single deployable, no CORS, co-located types. Express adds complexity without scaling need at this stage. |
| **ORM** | Prisma | Drizzle, raw SQL, TypeORM | TypeScript-first, auto-generated types from schema, migration system, excellent Next.js compatibility. |
| **State management** | Zustand | Redux Toolkit, Jotai | Minimal boilerplate, small bundle (~2KB), sufficient for dental practice scope. Redux overhead unjustified. |
| **Auth strategy** | NextAuth.js v5 with JWT | Clerk, Supabase Auth, custom JWT | First-party Next.js integration, stateless, no session store required. Clerk adds cost; custom adds maintenance burden. |
| **Dev database** | Docker Compose (PostgreSQL 16) | Local install, Supabase local | Consistent environment across team, `docker compose up` onboarding, CI parity. |
| **Layer pattern** | Repository + Service + Controller | Direct Prisma in routes, ActiveRecord | Testable units, swappable data sources (future: cache layer), clean separation of business logic from I/O. |

## Data Flow

```
HTTP Request
  │
  ▼
[App Router Route Handler]          ← auth middleware (Phase 2)
  │  validates input (Zod)
  ▼
[Service Layer]                     ← business logic, orchestration
  │  calls repository, enforces rules
  ▼
[Repository]                        ← data access abstraction
  │  wraps Prisma calls
  ▼
[Prisma Client] ──► PostgreSQL 16
```

**Dep injection** (manual, no framework): each layer receives its dependencies via constructor parameters. Services receive repositories; route handlers receive services. This avoids hidden coupling and simplifies unit testing.

## Route Design (App Router)

| Route Group | Path | Purpose | This Phase |
|---|---|---|---|
| `(auth)` | `/login`, `/register` | Unauthenticated pages | Placeholder files only |
| `(dashboard)` | `/dashboard`, `/dashboard/appointments`, `/dashboard/patients`, `/dashboard/statistics`, `/dashboard/settings` | Protected admin pages | Placeholder files only |
| `api/auth` | `/api/auth/[...nextauth]` | NextAuth.js catch-all | Placeholder — config in Phase 2 |
| `api/appointments` | `/api/appointments/[id]` | Appointment CRUD | Placeholder — logic in Phase 3 |
| `api/patients` | `/api/patients/[id]` | Patient CRUD | Placeholder — logic in Phase 3 |
| Public | `/` | Landing page | Default create-next-app page |

Placeholder files contain `export default function Page() { return <div>Placeholder</div> }` — minimal valid React components so `next build` and `npm run dev` pass.

## Key Interfaces

### Repository Contract (generic base)

```typescript
// src/repositories/base.repository.ts
export interface BaseRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(params?: { skip?: number; take?: number }): Promise<T[]>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}
```

### Service Layer Contract (example: Appointment)

```typescript
// src/services/appointment.service.ts
export class AppointmentService {
  constructor(private repo: AppointmentRepository) {}
  async schedule(data: CreateAppointmentDTO): Promise<Appointment> { /* ... */ }
  async reschedule(id: string, newTime: Date): Promise<Appointment> { /* ... */ }
  async cancel(id: string): Promise<Appointment> { /* ... */ }
}
```

### Prisma Schema (core models only)

- **User**: `id`, `email`, `passwordHash`, `name`, `role` (ADMIN | ASSISTANT), `createdAt`
- **Patient**: `id`, `firstName`, `lastName`, `phone`, `email?`, `notes?`, `createdAt`
- **Appointment**: `id`, `dateTime`, `status` (SCHEDULED | CONFIRMED | CANCELLED | COMPLETED), `type`, `notes?`, `patientId` (FK), `createdAt`

All use `cuid()` as primary key, `@default(now())` timestamps, and `@@map()` for snake_case table names.

## Technology Version Pinning

| Package | Version | Notes |
|---|---|---|
| next | ^14.2 | App Router stable, Server Actions available |
| react / react-dom | ^18.3 | Required by Next.js 14 |
| typescript | ^5.4 | Strict mode enabled |
| prisma | ^5.14 | Latest stable with PostgreSQL 16 support |
| @prisma/client | ^5.14 | Generated client |
| tailwindcss | ^3.4 | v4 not yet stable for production |
| zustand | ^4.5 | Latest stable |
| @tanstack/react-query | ^5.40 | Server-state management |
| zod | ^3.23 | Validation schemas |
| next-auth | ^5.0-beta | Auth.js v5 beta for App Router |
| eslint | ^8.57 | Flat config not yet universal; use `.eslintrc.json` |
| prettier | ^3.2 | With `prettier-plugin-tailwindcss` |
| jest | ^29.7 | + `@testing-library/react` ^15 |
| framer-motion | ^11.1 | Animations (no used in Phase 1) |

## Development Workflow

```bash
# First run
npm install
docker compose up -d                    # PostgreSQL 16 + pgAdmin
npx prisma generate                     # Generate Prisma Client
npx prisma db push                      # Push schema (no migrations yet)
npm run seed                             # Optional: seed test data
npm run dev                              # Next.js at localhost:3000

# Quality gates (identical to CI)
npm run lint                             # ESLint
npm run type-check                       # tsc --noEmit
npm run build                            # next build

# Docker
docker compose up -d                     # Start
docker compose down                      # Stop (data persists in volume)
docker compose down -v                   # Destroy volume (clean slate)
```

**Branching**: `main` (production), `develop` (integration). Feature branches from `develop`. PR target: `develop`. `main` gets merged from `develop` at stable milestones.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Create | User, Patient, Appointment models + relations |
| `prisma/migrations/*` | Create | Initial migration (auto-generated by Prisma) |
| `prisma/seed.ts` | Create | Seed script with sample data |
| `docker-compose.yml` | Create | PostgreSQL 16 + pgAdmin services |
| `.github/workflows/ci.yml` | Create | lint → type-check → build pipeline |
| `src/app/**/page.tsx` | Create | Placeholder pages for all route groups |
| `src/app/**/layout.tsx` | Create | Root layout + auth/dashboard group layouts |
| `src/lib/prisma.ts` | Create | Singleton Prisma client |
| `src/lib/utils.ts` | Create | Shared utilities (cn() for Tailwind, etc.) |
| `src/lib/validations.ts` | Create | Zod schemas (appointment, patient) |
| `src/repositories/base.repository.ts` | Create | Generic repository interface |
| `src/services/*.service.ts` | Create | Service class stubs |
| `src/types/*.ts` | Create | TypeScript type definitions |
| `src/store/useStore.ts` | Create | Zustand store shell |
| `tests/unit|integration|e2e/` | Create | Empty test directories |
| `.env.example` | Create | Template with all required env vars |
| `package.json` | Create | Dependencies + scripts |
| `tsconfig.json` | Create | Strict TypeScript config |
| `tailwind.config.ts` | Create | Tailwind CSS config |
| `next.config.mjs` | Create | Next.js configuration |
| `.eslintrc.json` | Create | ESLint + TypeScript rules |
| `.prettierrc` | Create | Prettier config |
| `.gitignore` | Create | Node/Next.js ignores |

## Testing Strategy

| Layer | What to Test | Approach | This Phase |
|---|---|---|---|
| Unit | Utils, validations, service logic | Jest + mocks | Structure only (empty dirs) |
| Integration | Repository + Prisma (in-mem or test DB) | Jest + test PostgreSQL | Deferred to Phase 3 |
| E2E | Full user flows | Playwright | Deferred to Phase 6 |

No tests written in Phase 1. Directory structure and test config files exist so tests can be added incrementally starting from Phase 2.

## Open Questions

- [ ] **npm vs pnpm?** Proposal assumes npm. pnpm reduces disk usage and is faster. Confirm team preference before scaffold.
- [ ] **`@/` path alias or relative imports?** Standard Next.js uses `@/` for `src/`. Confirm no objections.
- [ ] **Prisma `db push` vs `migrate dev` in early phases?** `db push` is faster for prototyping; formal migrations start in Phase 3 when schema stabilizes.
