# Tasks: Fase 7 — Pruebas y Optimización

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Test Fixes | PR 1 | jest.config, pkg.json deps, playwright.config, fix 7 broken tests + a11y test; ~190 lines |
| 2 | Dashboard Coverage | PR 2 | 18 spec-scenario tests in `tests/integration/dashboard/`; ~360 lines |
| 3 | Quality Gates | PR 3 | 3 E2E smoke specs, a11y audits, violation fixes; ~280 lines |
| 4 | Production Polish | PR 4 | SEO metadata on 10 pages, sitemap, robots, React.memo (4), dynamic import, next/image; ~243 lines |

## Phase 1: Foundation + Test Fixes

- [x] 1.1 Replace `jest.config.ts` single config with `projects[]` array: node env for `tests/unit/**`, jsdom for `tests/integration/**` and `tests/a11y/**`
- [x] 1.2 Pin `jest-environment-jsdom@^29.7.0` in `package.json`; add `@playwright/test` and `jest-axe` as devDeps; add scripts `test` (jest), `test:e2e` (playwright), `test:all` (jest + playwright)
- [x] 1.3 Create `playwright.config.ts`: `webServer` on port 3000, `fullyParallel: false`, `retries: 2`, `testDir: tests/e2e`
- [x] 1.4 Fix `tests/unit/auth.service.test.ts`: add `findById` + `update` to userRepository mock
- [x] 1.5 Fix `tests/unit/calendar.service.test.ts`: correct `googleapis` mock factory to `google.calendar({version:'v3', auth})` call signature
- [x] 1.6 Fix `tests/unit/useCalendar.test.ts`: moved to tests/integration/, rewritten with renderHook for React 18 compatibility
- [x] 1.7 Fix `tests/a11y/a11y-audit.test.tsx`: ensure jest-axe imports resolve in jsdom env; verify `npx jest` exits 0 for unit + integration (no dashboard yet)

## Phase 2: Dashboard Coverage

- [x] 2.1 Create `tests/integration/dashboard/home.test.tsx`: load, empty, error states (R1-R2 scenarios)
- [x] 2.2 Create `tests/integration/dashboard/appointments.test.tsx`: filter, validation-error, slot-occupied, edit (R3-R5)
- [x] 2.3 Create `tests/integration/dashboard/patients.test.tsx`: list, empty, search, create (R6-R7)
- [x] 2.4 Create `tests/integration/dashboard/responsive.test.tsx`: mobile, desktop viewport (R8)
- [x] 2.5 Create `tests/integration/dashboard/a11y.test.tsx`: keyboard-nav, focus-trap, screen-reader, contrast (R9)

## Phase 3: Quality Gates — E2E + A11y

- [ ] 3.1 Create `tests/e2e/auth.spec.ts`: login → dashboard redirect smoke; logout → login redirect
- [ ] 3.2 Create `tests/e2e/appointment.spec.ts`: create appointment via modal → visible in list
- [ ] 3.3 Create `tests/e2e/navigation.spec.ts`: dashboard renders within 5s; patient CRUD flow with UI confirmation
- [ ] 3.4 Add jest-axe audits in `tests/a11y/` for Modal, CalendarView, Table, and form inputs — target zero violations
- [ ] 3.5 Fix WCAG violations found: 4.5:1 color contrast, accessible input labels, modal focus trapping, keyboard operability

## Phase 4: Production Polish — SEO + Performance

- [ ] 4.1 Split `src/app/(dashboard)/layout.tsx` into server layout (metadata export) + `DashboardClientLayout.tsx` ("use client" providers wrapper)
- [ ] 4.2 Add `metadata` export to root `page.tsx`, `(auth)/layout.tsx`, and all 10 page routes — non-empty `title` and `description`
- [ ] 4.3 Create `src/app/sitemap.ts`: `sitemap.xml` with `url`, `lastModified`, `changeFrequency`, `priority`; exclude `/dashboard/` and `/api/`
- [ ] 4.4 Create `src/app/robots.ts`: `Allow: /`, `Disallow: /dashboard/`, `Disallow: /api/`
- [ ] 4.5 Wrap `StatsCard`, `StatusBadge`, `EmptyState`, `Spinner` exports with `React.memo`
- [ ] 4.6 Dynamic import Recharts in `statistics/page.tsx` via `next/dynamic(() => import('recharts'), { ssr: false })`
- [ ] 4.7 Replace static `<img>` with `next/image` + `priority` on above-fold images; verify `npm run lint` + `npm run type-check` pass
