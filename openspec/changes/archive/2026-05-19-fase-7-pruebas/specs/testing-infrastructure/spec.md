# testing-infrastructure Specification

## Purpose

Jest dual-env execution, broken-test fixes, and dashboard spec-scenario coverage.

## Requirements

### Requirement: Jest Dual-Environment

The project SHALL use Jest projects: `testEnvironment: "node"` for `tests/unit/**`, `testEnvironment: "jsdom"` for `tests/integration/**` and `tests/a11y/**`. `jest-environment-jsdom` MUST be pinned to v29.

#### Scenario: Dual env works

- GIVEN jest.config.ts with projects array
- WHEN `npx jest` runs
- THEN unit tests execute in node; component/a11y tests execute in jsdom; zero env mismatch errors

### Requirement: Broken Test Remediation

Seven failing tests SHALL be fixed: auth.service (add findById/update to prisma mock), calendar.service (fix googleapis factory mock), useCalendar (fix store selector pattern).

#### Scenario: All tests pass

- WHEN `npx jest` runs with fixed mocks
- THEN exit code 0; all 7 previously-failing tests pass

### Requirement: Dashboard Spec Scenario Tests

Eighteen tests SHALL cover dashboard-ui requirements R1-R9 scenarios: load, empty, error, filter, validation-error, slot-occupied, edit, mobile, desktop, keyboard-nav, focus-trap, screen-reader, contrast. Tests reside in `tests/integration/dashboard/`.

#### Scenario: Dashboard test suite passes

- WHEN `npx jest tests/integration/dashboard/` runs
- THEN 18+ tests pass covering happy path, empty, and error states
