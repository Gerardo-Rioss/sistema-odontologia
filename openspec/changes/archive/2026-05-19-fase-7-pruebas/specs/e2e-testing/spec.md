# e2e-testing Specification

## Purpose

Playwright smoke tests for critical user flows.

## Requirements

### Requirement: Playwright Configuration

The project SHALL configure Playwright with `webServer` on `localhost:3000`, `fullyParallel: false`, 2 retries. Specs reside in `tests/e2e/`.

#### Scenario: Playwright executes

- GIVEN dev server running on port 3000
- WHEN `npx playwright test` runs
- THEN headless browser launches; all specs execute

### Requirement: Smoke Test Suite

Five smoke tests SHALL verify: login, create appointment, view dashboard, patient CRUD, logout. Each MUST assert on visible UI state.

#### Scenario: Login smoke

- GIVEN valid credentials
- WHEN login submitted
- THEN redirected to `/dashboard`

#### Scenario: Create appointment smoke

- WHEN authenticated user creates appointment via modal
- THEN new appointment visible in list

#### Scenario: View dashboard smoke

- WHEN `/dashboard` loads
- THEN stats and upcoming appointments render within 5s

#### Scenario: Patient CRUD smoke

- WHEN creating, searching, deleting a test patient
- THEN each operation completes with UI confirmation

#### Scenario: Logout smoke

- WHEN logout clicked
- THEN redirected to `/login`; dashboard inaccessible
