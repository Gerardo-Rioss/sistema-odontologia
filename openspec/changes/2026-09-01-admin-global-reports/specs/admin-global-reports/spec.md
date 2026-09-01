# admin-global-reports Specification

## Purpose

ADMIN-only global statistics across all users of the system: aggregated KPIs, per-user comparison, date-range timelines, and printable PDF reports. DENTIST users continue to see only their own data.

## Requirements

### Requirement: ADMIN Role Guard

The system SHALL restrict all global statistics endpoints and the admin dashboard to users with role `ADMIN`. Requests from non-ADMIN sessions MUST receive 403.

#### Scenario: DENTIST blocked from global endpoints

- GIVEN a session with role `DENTIST`
- WHEN `GET /api/statistics/global/overview` is requested
- THEN the response is 403 Forbidden and no data is returned

#### Scenario: ADMIN allowed

- GIVEN a session with role `ADMIN`
- WHEN `GET /api/statistics/global/overview` is requested
- THEN the response is 200 with the global dataset

#### Scenario: Unauthenticated request

- GIVEN no valid session
- WHEN any `/api/statistics/global/*` endpoint is requested
- THEN the response is 401 Unauthorized

### Requirement: Global Overview

The system SHALL provide `GET /api/statistics/global/overview` returning KPIs aggregated across ALL users: `totalPatients`, `totalAppointments` (last 12 months), `appointmentsToday`, and `completionRate` (0–100 integer).

#### Scenario: aggregates across users

- GIVEN user A has 30 patients and 40 appointments (30 completed), user B has 20 patients and 25 appointments (15 completed)
- WHEN the global overview is computed
- THEN `totalPatients = 50`, `totalAppointments = 65`, `completionRate = 69` (45/65)

#### Scenario: no data at all

- GIVEN zero patients and zero appointments in the database
- WHEN the global overview is computed
- THEN all KPIs are 0 and no error is thrown

### Requirement: Per-User Comparison

The system SHALL provide `GET /api/statistics/global/by-user` returning one row per user with `userId`, `name`, `totalPatients`, `totalAppointments`, `completed`, `cancelled`, and `cancellationRate`.

#### Scenario: two dentists compared

- GIVEN users "Dr. García" (50 patients, 60 appointments) and "Dra. Martínez" (30 patients, 40 appointments)
- WHEN `by-user` is computed
- THEN the response contains 2 rows with the correct per-user counts, ordered by name

#### Scenario: user with no activity

- GIVEN a user with zero appointments
- WHEN `by-user` is computed
- THEN that user's row shows 0s and `cancellationRate = 0` (no division by zero)

### Requirement: Timeline with Date Range

The system SHALL provide `GET /api/statistics/global/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD` returning a monthly series aggregated across all users within the range. Months with no appointments MUST have `count: 0`; labels use `MMM yyyy` (e.g. "Sep 2026").

#### Scenario: filtered range

- GIVEN appointments in Jan, Feb, Mar 2026
- WHEN `timeline?from=2026-01-01&to=2026-02-28` is computed
- THEN the series contains Jan and Feb counts and excludes March

#### Scenario: invalid range

- GIVEN `from` after `to`
- WHEN the endpoint is called
- THEN responds 400 Bad Request

### Requirement: Admin Dashboard

The system SHALL provide `/dashboard/admin` rendering global StatsCards, a per-user comparison table, and a date-range filter. A non-ADMIN visiting the page MUST be redirected away or shown a 403 message.

#### Scenario: ADMIN sees global KPIs

- GIVEN an ADMIN session and data for both users
- WHEN `/dashboard/admin` renders
- THEN global cards show aggregated values and the comparison table lists both users

#### Scenario: DENTIST blocked from page

- GIVEN a DENTIST session
- WHEN `/dashboard/admin` is requested
- THEN the user is redirected (or sees a 403 message) and no global data is fetched

### Requirement: Printable PDF Reports

The system SHALL provide print-optimized report views for: activity per period, new vs returning patients, and productivity per dentist. Each view SHALL render an A4-printable layout and be saved as PDF via the browser print dialog ("Imprimir / Guardar PDF" button calling `window.print()`).

#### Scenario: activity report with data

- GIVEN range 2026-01-01..2026-01-31 with 10 appointments (7 completed, 2 cancelled, 1 pending) split between two dentists
- WHEN the activity report renders with that range
- THEN the page shows counts by status and per dentist, with a printable header including the range

#### Scenario: new vs returning report

- GIVEN 8 distinct patients: 3 with 1 appointment each, 5 with 2+ appointments (across all users)
- WHEN the new vs returning report renders
- THEN it shows `newPatients: 3`, `returningPatients: 5` globally

#### Scenario: productivity report

- GIVEN two dentists with different completion/cancellation rates
- WHEN the productivity report renders
- THEN it shows per-dentist completed/cancelled/completion rate in a printable table
