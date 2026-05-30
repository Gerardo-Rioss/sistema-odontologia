# Proposal: Fase 7 — Pruebas y Optimización

## Intent

Tests exist (~150+ cases, 15 files) but can't run — jest-environment-jsdom v30 is broken with current jsdom, jest config uses `testEnvironment: "node"`, and 7 tests have mock bugs. TDD is disabled project-wide. This phase enables TDD, adds missing coverage (18 dashboard-ui scenarios), configures Playwright E2E, applies performance optimizations, adds per-page SEO metadata + sitemap/robots, and installs jest-axe for accessibility auditing. Quality gate before deployment.

## Scope

### In Scope
- Fix Jest: dual-env config (node for unit, jsdom for component tests), pin `jest-environment-jsdom@29`
- Fix 7 broken tests: auth.service (prisma mock: missing findById/update), calendar.service (googleapis mock structure)
- Add 18 dashboard-ui spec scenario tests: Home, Calendar, Appointment List/Modal, Patients, Stats, Responsive, A11y (R1-R9)
- Configure Playwright: config + 3 smoke specs (login→dashboard→create appointment)
- Performance: React.memo on 4 presentational components, dynamic import Recharts, next/image for static assets
- SEO: per-page `metadata` export on all 10 pages, `app/sitemap.ts`, `app/robots.ts`
- A11y: install jest-axe, audit components, fix violations

### Out of Scope
Load testing (needs k6 + deployed env), security audit (needs external tools), general bug fixing beyond known 7

## Capabilities

### New Capabilities
- `testing-infrastructure`: Jest dual-env config, ts-jest transforms, mock conventions
- `seo-metadata`: Per-page Next.js Metadata API, sitemap.xml, robots.txt
- `e2e-testing`: Playwright config, smoke tests for auth + CRUD
- `accessibility-compliance`: jest-axe integration, WCAG 2.1 AA audit
- `performance-optimization`: React.memo, dynamic imports, next/image patterns

### Modified Capabilities
None — existing spec requirements unchanged. This phase adds test coverage + quality infrastructure.

## Approach

1. **Jest**: `jest.config.ts` → `projects` array: `{ testEnvironment: "node", testMatch: ["tests/unit/**"] }` + `{ testEnvironment: "jsdom", testMatch: ["tests/integration/**", "tests/a11y/**"] }`. Pin `jest-environment-jsdom@29`.
2. **7 failures**: auth.service — extend userRepository mock with findById/update. calendar.service — fix googleapis factory mock to `google.calendar({version: 'v3', auth})`. useCalendar — fix mockStore selector pattern.
3. **18 scenarios**: Write tests in `tests/integration/dashboard/` mapping each spec scenario (R1-R9) to test file.
4. **Playwright**: `playwright.config.ts` → `webServer: { command: 'npm run dev', port: 3000 }`. 3 spec files under `tests/e2e/`.
5. **Perf**: `React.memo(StatsCard)`, `React.memo(StatusBadge)`, `React.memo(EmptyState)`, `React.memo(Spinner)`. `dynamic(() => import('recharts'), {ssr: false})`. Add `next/image` `priority`/`sizes` where applicable.
6. **SEO**: `export const metadata: Metadata = {...}` per page. `sitemap.ts` returns `[{url, lastModified, changeFrequency, priority}]`. `robots.ts` returns `{rules: {userAgent: '*', allow: '/', disallow: '/dashboard/'}}`.
7. **A11y**: Run `axe()` on Modal, CalendarView, Table, form inputs. Fix contrast/label violations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `jest.config.ts` | Modified | Dual projects config |
| `tests/` (15 files) | Modified | Fix mocks, remove TDD-guard comments |
| `tests/integration/dashboard/` | New | 18 scenario tests |
| `playwright.config.ts` | New | E2E config |
| `tests/e2e/` | New | 3 smoke specs |
| `src/app/**/page.tsx` | Modified | Metadata exports |
| `src/app/sitemap.ts`, `robots.ts` | New | SEO artifacts |
| `src/components/{dashboard,ui}/` | Modified | React.memo + dynamic imports |
| `package.json` | Modified | jest-axe, playwright, jest-environment-jsdom@29 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| jest-environment-jsdom@29 still mismatches | Low | Fallback: use jest 29's bundled jsdom v20 without explicit env dep |
| Mock fixes cascade into new failures | Low | Fix per-file, `npx jest --verbose` after each, revert per-file |
| Playwright flaky in CI | Med | `fullyParallel: false`, short timeouts, `retries: 2` |
| Page metadata conflicts with "use client" | Low | Move metadata to layout.tsx where pages are client-only |
| React.memo breaks callback equality | Low | Only wrap presentational components, stable props |

## Rollback Plan

All deliverables independent + reversible: `git checkout jest.config.ts package.json`, remove memo/dynamic wrappers, revert metadata exports, delete `playwright.config.ts` + `tests/e2e/`, `npm uninstall jest-axe`.

## Dependencies

- `jest-environment-jsdom@29` (downgrade from broken v30)
- `@playwright/test` (new)
- `jest-axe` (new dev dep)

## Success Criteria

- [ ] `npx jest` exits 0, all 150+ tests pass
- [ ] 7 known failures resolved + root cause documented
- [ ] 18 new dashboard spec scenario tests implemented + passing
- [ ] `npx playwright test` passes in headless mode
- [ ] `npx jest --coverage` reports >80% line coverage on `src/components/`, `src/services/`, `src/hooks/`
- [ ] All 10 pages export `metadata` with title + description
- [ ] `sitemap.xml` and `robots.txt` generated at build time
- [ ] jest-axe audit passes zero violations on CI
- [ ] `npm run lint` and `npm run type-check` pass with zero errors
