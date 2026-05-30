# Design: Fase 7 — Pruebas y Optimización

## Technical Approach

Quality infrastructure layer over existing app. No new architecture — fixes broken testing, adds coverage, wraps components for perf, adds SEO metadata. All 7 work areas are independent; any can roll back without affecting others.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|-------------|-----------|
| 1 | Jest dual-env | `projects[]` array: node (unit) + jsdom (integration/a11y) | Single config with file pragmas, separate jest.config files | Projects array is Jest-native, avoids per-file `@jest-environment` pragmas, clear test-domain separation |
| 2 | jsdom version | Pin `jest-environment-jsdom@29` | v30 (broken), bundled jsdom via jest 29 | v30 has known compat issue with current jsdom; v29 is stable and matches jest 29.7 |
| 3 | SEO for "use client" pages | Separate server layout wrapper above client layout | useEffect document.title, per-page head.tsx (Pages Router only) | Next.js 14 App Router: metadata MUST come from server components. Dashboard layout refactored to client wrapper inside server layout |
| 4 | Perf wrapping | `React.memo(StatsCard\|StatusBadge\|EmptyState\|Spinner)` only | memo on all components, useMemo/useCallback everywhere | Only presentational leaf components with stable props benefit; premature memo on stateful components adds complexity |
| 5 | Recharts dynamic import | `next/dynamic(() => import('recharts'), { ssr: false })` in statistics page | Tree-shaking config, code splitting by route | Recharts is ~200KB gzipped and only used on /statistics — SSR-disabled dynamic import eliminates it from main bundle |
| 6 | Playwright config | Serial execution, retries:2, webServer auto-start | Parallel workers, CI-only config | Serial avoids DB race conditions in smoke tests; retries handle CI flakiness; webServer removes manual start step |

## Data Flow

```
jest.config.ts (projects array)
    ├── project: "unit" (testEnvironment: "node")
    │   └── tests/unit/**/*.test.ts   ← auth, calendar, validations, encryption...
    └── project: "jsdom" (testEnvironment: "jsdom")
        ├── tests/integration/**/*.test.tsx   ← CalendarView, AppointmentModal...
        ├── tests/a11y/**/*.test.tsx          ← jest-axe audits
        └── tests/integration/dashboard/**/*.test.tsx  ← new 18 scenarios

playwright.config.ts → webServer: localhost:3000
    └── tests/e2e/
        ├── auth.spec.ts      (login → dashboard redirect)
        ├── appointment.spec.ts (create appointment flow)
        └── navigation.spec.ts  (sidebar → pages load)

src/app/(dashboard)/
    layout.tsx (SERVER — metadata export) → DashboardClientLayout.tsx ("use client" — providers)
    └── pages inherit metadata template

src/app/sitemap.ts → build-time static generation
src/app/robots.ts  → build-time static generation
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `jest.config.ts` | Modify | Replace single config with `projects[]` array: `{testEnvironment:"node",...}` + `{testEnvironment:"jsdom",...}` |
| `package.json` | Modify | Downgrade `jest-environment-jsdom` to `^29.7.0`, add `@playwright/test`, add `jest-axe`, add `test` + `test:e2e` scripts |
| `tests/unit/auth.service.test.ts` | Modify | Add `findById` + `update` to userRepository mock |
| `tests/unit/calendar.service.test.ts` | Modify | Fix `googleapis` mock factory: `google.calendar({version:'v3', auth})` call signature |
| `tests/unit/useCalendar.test.ts` | Modify | Fix `useStore` selector pattern — mock typed selector |
| `tests/integration/dashboard/` | Create | 18 spec scenario tests: home, calendar, list, modal, patients, stats, responsive, a11y |
| `tests/e2e/auth.spec.ts` | Create | Playwright smoke: login → dashboard |
| `tests/e2e/appointment.spec.ts` | Create | Playwright smoke: create appointment |
| `tests/e2e/navigation.spec.ts` | Create | Playwright smoke: sidebar navigation |
| `playwright.config.ts` | Create | E2E config with webServer, retries, serial mode |
| `src/app/(dashboard)/layout.tsx` | Modify | Split into server layout (metadata) + client wrapper (providers) |
| `src/app/(dashboard)/DashboardClientLayout.tsx` | Create | Extract current layout providers + UI into client component |
| `src/app/page.tsx` | Modify | Add root metadata export with title + description |
| `src/app/(auth)/login/page.tsx` | Modify | Add metadata via parent layout |
| `src/app/(auth)/layout.tsx` | Modify | Export metadata for auth pages |
| `src/app/sitemap.ts` | Create | Build-time sitemap with all 10 pages |
| `src/app/robots.ts` | Create | Robots rules: allow `/`, disallow `/dashboard/` |
| `src/components/dashboard/StatsCard.tsx` | Modify | Wrap export with `React.memo` |
| `src/components/ui/StatusBadge.tsx` | Modify | Wrap export with `React.memo` |
| `src/components/ui/EmptyState.tsx` | Modify | Wrap export with `React.memo` |
| `src/components/ui/Spinner.tsx` | Modify | Wrap export with `React.memo` |
| `src/app/(dashboard)/dashboard/statistics/page.tsx` | Modify | Dynamic import Recharts with `ssr:false` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Services (auth, calendar, encryption, rate-limit, NLP), hooks, validations, components | node env — mock all external deps. 15 files, ~150 cases |
| Integration | CalendarView, AppointmentModal, OAuth, webhook, dashboard scenarios | jsdom env — render components with mocked hooks. 18 new dashboard scenarios |
| E2E | Auth login, appointment CRUD, sidebar navigation | Playwright headless against localhost:3000. 3 smoke specs |
| A11y | Modal, CalendarView, Table, form inputs, StatusBadge, Spinner | jest-axe programmatic audit. Zero-violations target |

## Open Questions

None. All decisions are resolved. Risk mitigations from proposal cover unknowns.
