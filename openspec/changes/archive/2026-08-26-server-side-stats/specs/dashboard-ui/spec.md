# dashboard-ui — Delta for R7 (Server-Side Statistics)

## MODIFIED Requirements

### Requirement: Statistics Dashboard (R7)

Statistics SHALL render bar (monthly), pie (type distribution), and line (cancellation rate) charts from server-computed data fetched via `GET /api/statistics/overview`. The `useStatistics` hook fetches from the API instead of computing client-side. Same 9 metrics, same `StatisticsReturn` interface, zero consumer breaking changes.

(Previously: Charts rendered from client-computed appointment data via `useMemo` in `useStatistics` hook.)

#### Scenario: Charts with data

- GIVEN 12 months of appointments
- WHEN `/dashboard/statistics` renders
- THEN `useStatistics` fetches from `/api/statistics/overview`; 3 charts display with correct values matching server-computed output

#### Scenario: Zero data

- GIVEN zero appointments in database
- WHEN `/api/statistics/overview` returns zeroed overview
- THEN each chart area shows "Sin datos suficientes" empty state; no broken charts

#### Scenario: API fails

- GIVEN `/api/statistics/overview` returns 500
- WHEN statistics page renders
- THEN `useStatistics` sets `error` state; dashboard shows error message with retry; charts do not render broken data
