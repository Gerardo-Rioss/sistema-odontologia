# Tasks: Setup Inicial — Arquitectura y Herramientas Base

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900 (300 config + 280 DB + 250 app + 120 CI) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Lines |
|------|------|-----------|------|-------|
| 1 | Git, tooling config, library code | PR 1 | `main` | ~300 |
| 2 | Docker, Prisma schema, migration, seed | PR 2 | PR 1 | ~250 |
| 3 | App Router structure, CI, verification | PR 3 | PR 2 | ~350 |

Note: chain strategy pending resolution (stacked-to-main or feature-branch-chain). PR bases above assume feature-branch-chain; retarget accordingly.

---

## Phase 1: Project Scaffold & Tooling (PR 1)

- [x] 1.1 Git init (`main` + `develop`), create `.gitignore` (Node, Next.js, Prisma, Docker, .env)
- [x] 1.2 Scaffold via `create-next-app` (TS, App Router, Tailwind) → generates `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- [x] 1.3 Add missing deps: prisma, @prisma/client, zustand, @tanstack/react-query, zod, next-auth, framer-motion, clsx, tailwind-merge
- [x] 1.4 Add devDeps: prisma, @typescript-eslint/*, prettier, prettier-plugin-tailwindcss, jest, @testing-library/react, ts-node
- [x] 1.5 Create `.eslintrc.json` (`@typescript-eslint/recommended`) and `.prettierrc` (singleQuote, semi, tailwindcss plugin)
- [x] 1.6 Create `.env.example`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [x] 1.7 Add npm scripts: `dev`, `build`, `lint`, `type-check`, `db:push`, `db:migrate`, `db:generate`, `db:seed`, `db:studio`
- [x] 1.8 Set `@/` → `src/` path alias in `tsconfig.json` (existing `create-next-app` config)
- [x] 1.9 Create `src/lib/prisma.ts` (singleton with `globalThis` caching) [fulfills DS-2 partial]
- [x] 1.10 Create `src/lib/utils.ts` (`cn()` with `clsx` + `tailwind-merge`)
- [x] 1.11 Define Zod schemas in `src/lib/validations.ts` (CreateAppointmentDTO, CreatePatientDTO, UpdateAppointmentDTO)
- [x] 1.12 Create `src/types/index.ts` (User, Patient, Appointment, Role, AppointmentStatus, ApiResponse)

## Phase 2: Database Infrastructure (PR 2)

- [x] 2.1 Create `docker-compose.yml` (PostgreSQL 16 port 5432 + pgAdmin port 5050, named volume)
- [x] 2.2 Define `prisma/schema.prisma`: datasource (PostgreSQL), generator (prisma-client-js), enums (Role: ADMIN|DENTIST, AppointmentStatus: SCHEDULED|COMPLETED|CANCELLED), models (User, Patient, Appointment with cuid PKs, @default(now()), @@map snake_case) [fulfills DS-1]
- [x] 2.3 Generate initial migration: `npx prisma migrate dev --name init` [fulfills DS-2]
- [x] 2.4 Create `prisma/seed.ts` (2 users, 5 patients, 3 appointments) using PrismaClient
- [x] 2.5 Create `src/repositories/base.repository.ts` (generic BaseRepository<T, CreateInput, UpdateInput> interface)

## Phase 3: App Structure & Placeholders (PR 3)

- [x] 3.1 Create root `src/app/layout.tsx` (RootLayout: `<html lang="es">`, metadata, body with globals.css, Inter font) and `src/app/page.tsx` (landing placeholder)
- [x] 3.2 Create `src/app/globals.css` (@tailwind directives)
- [x] 3.3 Create `src/app/(auth)/layout.tsx` (centered card layout), `(auth)/login/page.tsx`, `(auth)/register/page.tsx` — all Spanish UI labels
- [x] 3.4 Create `src/app/(dashboard)/layout.tsx` (sidebar + header with 5 Spanish nav items) and 5 pages: `dashboard/page.tsx` (stats cards), `dashboard/appointments/page.tsx`, `dashboard/patients/page.tsx`, `dashboard/statistics/page.tsx`, `dashboard/settings/page.tsx`
- [x] 3.5 Create API stubs: `api/auth/[...nextauth]/route.ts` (delegates to lib/auth.ts), `api/appointments/route.ts`, `api/appointments/[id]/route.ts`, `api/patients/route.ts`, `api/patients/[id]/route.ts`, plus `api/whatsapp/webhook/route.ts`, `api/calendar/sync/route.ts`, `api/statistics/overview/route.ts` — all return JSON placeholder messages
- [x] 3.6 Create service stubs: `src/services/appointment.service.ts`, `patient.service.ts`, `calendar.service.ts`, `whatsapp.service.ts`, `notification.service.ts`, `auth.service.ts` (6 services, all class-based with placeholder method signatures)
- [x] 3.7 Create Zustand store: `src/store/useStore.ts` (user, isAuthenticated, sidebarOpen, login, logout, toggleSidebar, setSidebarOpen)
- [x] 3.8 Create NextAuth config: `src/lib/auth.ts` (Credentials provider, JWT strategy with id+role callbacks, no database adapter) — replaces original 3.8 middleware task per orchestrator directive

## Phase 4: CI/CD & Verification (PR 3 continued)

- [x] 4.1 Create `.github/workflows/ci.yml`: 3 parallel jobs (lint, type-check, build), triggers on push to `main`+`develop` and PR to `main`, Node 20 + npm ci cache [fulfills CI-1]
- [x] 4.2 Add commented Vercel deploy skeleton with `amondnet/vercel-action` reference and `# TODO: Uncomment when Vercel project is configured` [fulfills CI-2]
- [x] 4.3 Create `jest.config.ts` (ts-jest, @/ path alias via moduleNameMapper) and `tests/unit/`, `tests/integration/`, `tests/e2e/` with `.gitkeep`
- [x] 4.4 Verify quality gates: `npm run lint` ✅ (0 errors), `npm run type-check` ✅ (0 errors), `npm run build` ✅ (16 routes)
- [ ] 4.5 Verify Docker: `docker compose up -d`, `npx prisma db push`, `npx prisma db seed`, `docker compose down` — ⏭️ Skipped (Docker not installed, same as PR 2)
