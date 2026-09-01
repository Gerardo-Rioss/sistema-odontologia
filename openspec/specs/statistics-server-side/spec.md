# statistics-server-side Specification

## Purpose

Server-side computation of dashboard statistics. Replaces client-side `useMemo` filters with Prisma aggregate/groupBy queries, served via a REST API endpoint. Same 9 metrics, same `StatisticsReturn` interface, zero consumer breaking changes.

## Requirements

### Requirement: StatisticsRepository Data Access

The system SHALL provide a `StatisticsRepository` that queries Prisma for all 9 dashboard metrics. All queries MUST be scoped by `userId` (multi-tenant isolation).

#### Scenario: getOverview with data

- GIVEN 45 appointments in last 12 months, 30 completed, 120 total patients
- WHEN `getOverview(userId)` is called
- THEN returns `{ totalAppointments: 45, totalPatients: 120, appointmentsToday: <count for today>, completionRate: 67 }`

#### Scenario: getOverview with no appointments

- GIVEN zero appointments in last 12 months, zero patients
- WHEN `getOverview(userId)` is called
- THEN returns `{ totalAppointments: 0, totalPatients: 0, appointmentsToday: 0, completionRate: 0 }`

#### Scenario: getByMonth returns 12-month array

- GIVEN appointments across 6 distinct months in the last 12 months
- WHEN `getByMonth(userId)` is called
- THEN returns array of 12 entries (one per month), months with no appointments have `count: 0`, labels use `MMM yyyy` format (e.g. "Ene 2026")

#### Scenario: getByType returns type breakdown

- GIVEN 20 LIMPIEZA, 15 REVISION, 5 URGENCIA appointments
- WHEN `getByType(userId)` is called
- THEN returns array with `{ type: "Limpieza", count: 20 }` etc. using Spanish labels

#### Scenario: getByStatus returns status breakdown

- GIVEN 10 PENDING, 5 CONFIRMED, 3 CANCELLED, 12 COMPLETED
- WHEN `getByStatus(userId)` is called
- THEN returns array with `{ status: "Pendiente", count: 10 }` etc. using Spanish labels

#### Scenario: getNewVsReturning patient split

- GIVEN 8 distinct patients: 3 with 1 appointment each, 5 with 2+ appointments
- WHEN `getNewVsReturning(userId)` is called
- THEN returns `{ newPatients: 3, returningPatients: 5 }`

### Requirement: StatisticsService Orchestration

The system SHALL provide a `StatisticsService` that calls the repository, transforms raw Prisma output, and returns the complete `StatisticsReturn` shape. The service MUST be framework-independent.

#### Scenario: getStatistics returns complete response

- GIVEN valid userId with appointment data
- WHEN `StatisticsService.getStatistics(userId)` is called
- THEN returns `{ overview, appointmentsByMonth, byType, byStatus, completionTrend, cancellationRate, newVsReturning }` — all fields populated, `completionRate` and `cancellationRate` as 0–100 integers

#### Scenario: Service applies label mappings

- GIVEN repository returns raw type `LIMPIEZA` and status `COMPLETED`
- WHEN service transforms the response
- THEN type label is `"Limpieza"` and status label is `"Completada"`

### Requirement: Statistics API Endpoint

`GET /api/statistics/overview` SHALL return real aggregated statistics for the authenticated user.

#### Scenario: Authenticated request returns data

- GIVEN valid NextAuth session
- WHEN `GET /api/statistics/overview` is called
- THEN responds 200 with complete `StatisticsReturn` JSON (excluding `isLoading` and `error`)

#### Scenario: Unauthenticated request returns 401

- GIVEN no session
- WHEN `GET /api/statistics/overview` is called
- THEN responds 401 with `{ error: "Unauthorized" }`

#### Scenario: API failure returns 500

- GIVEN repository throws an unexpected error
- WHEN `GET /api/statistics/overview` is called
- THEN responds 500 with `{ error: "Internal server error" }`

### Requirement: useStatistics Hook Client Fetch

`useStatistics` hook SHALL fetch from `/api/statistics/overview` via `useQuery` instead of computing client-side. The exported interface MUST remain identical — zero breaking changes to consumers.

#### Scenario: Hook fetches from API

- GIVEN hook mounted in a component
- WHEN component renders
- THEN hook calls `GET /api/statistics/overview`; `isLoading` is `true` during fetch; `StatisticsReturn` shape matches previous interface

#### Scenario: Hook error state

- GIVEN API returns 500
- WHEN hook fetches
- THEN `error` is set to the error message; `overview` returns zeroed values; charts degrade gracefully

#### Scenario: No duplicate data fetching

- GIVEN `useAppointments` is also called on the statistics page
- WHEN page renders
- THEN `useAppointments` is called only once (not redundantly inside `useStatistics`)
