# Sistema de Gestión Odontológica

## Stack
- Next.js 14 (App Router + Server Components)
- TypeScript 5.4+
- React 18 + Tailwind CSS 3 + Framer Motion 11
- shadcn/ui + Radix UI primitives
- PostgreSQL + Prisma ORM 5.14
- NextAuth.js v5 (JWT + Credentials)
- React Hook Form + Zod validation
- React Query (TanStack) + Zustand state
- Recharts for charts
- WhatsApp Business API + Google Calendar API
- Sentry for monitoring

## Architecture
- **Repository Pattern**: `src/repositories/` abstracts Prisma access
- **Service Layer**: `src/services/` contains business logic, framework-independent
- **DTO + Zod**: Input/output validation in `src/lib/validations.ts`
- **Server Components**: Pages render server-side, client components only where needed (`"use client"`)
- **Design Tokens**: CSS custom properties in `globals.css` (HSL-based, shadcn/ui convention)

## Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, register, forgot-password
│   ├── (dashboard)/        # Admin panel (appointments, patients, statistics, settings)
│   └── api/                # REST API routes
├── components/
│   ├── ui/                 # shadcn/ui components (Button, Card, Input, Table, etc.)
│   ├── dashboard/          # Dashboard-specific (Sidebar, Header, StatsCard, AppointmentList, etc.)
│   ├── auth/               # Auth-specific (SessionProvider)
│   └── onboarding/         # Onboarding tour (planned)
├── hooks/                  # Custom hooks (useAppointments, usePatients, useStatistics, useCalendar)
├── lib/                    # Utilities (auth, prisma, encryption, validations, formatters, rate-limiter)
├── repositories/           # Data access (base, appointment, patient, user, calendar)
├── services/               # Business logic (appointment, auth, calendar, conversation, notification, patient, reminder, whatsapp)
├── store/                  # Global state (Zustand: useStore)
└── types/                  # Shared TypeScript types
```

## Key Commands
- `npm run dev` — dev server (localhost:3000)
- `npm run build` — production build
- `npm test` — Jest unit + integration (372 tests)
- `npm run test:e2e` — Playwright E2E
- `npm run lint` — ESLint
- `npm run type-check` — TypeScript check
- `npm run db:push` — sync Prisma schema with DB
- `npm run db:studio` — Prisma Studio UI
- `npm run format` — Prettier

## Color System (Design Tokens)
- Primary: dental blue `hsl(201, 96%, 32%)` / dark: `hsl(199, 89%, 48%)`
- Muted: `hsl(201, 20%, 96%)` / dark: `hsl(201, 30%, 12%)`
- Border radius: `0.5rem` (lg), `calc(var(--radius) - 2px)` (md)
- Dark mode via `next-themes` with `class` strategy

## Current State
- 372 tests passing (unit + integration + E2E)
- UI polish plan at `.hermes/plans/2026-07-02_ui-ux-polish.md`
- 3 phases: design consistency → animations → onboarding
- Ready for SDD workflow

## Engram
- Memory server at `localhost:7437`
- Auto-saves architecture decisions, bugs, patterns
- OpenCode plugin auto-connects to Engram

## GGA (Guardian Angel)
- Code review on every commit
- Run `gga init && gga install` once per project
