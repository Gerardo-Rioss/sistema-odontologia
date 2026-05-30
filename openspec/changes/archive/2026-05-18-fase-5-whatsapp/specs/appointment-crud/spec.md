# Delta for Appointment CRUD

## ADDED Requirements

### Requirement: Available Slots Query
The system SHALL expose `GET /api/appointments/available-slots` returning free 30-minute time slots for a given date.

| Param | Required | Description |
|-------|----------|-------------|
| date | YES | ISO date (YYYY-MM-DD) |
| serviceType | No | AppointmentType filter (reserved) |

Response: `{ slots: [{ time: "HH:mm" }] }`. Slots generated from 09:00–18:00 business hours in 30-min increments. SHALL exclude slots occupied by PENDING or CONFIRMED appointments. CANCELLED appointments do NOT block slots.

Auth: MUST require valid session (401 if missing). Authorization: SHALL filter to session userId's appointments only — no cross-tenant slot leakage.

#### Scenario: Query available slots for date
- GIVEN dentist has CONFIRMED appointment at 10:00 on 2026-06-15
- WHEN GET /api/appointments/available-slots?date=2026-06-15
- THEN 200, slots array excludes "10:00", includes "09:30", "10:30", etc. through "18:00"

#### Scenario: All slots booked
- GIVEN dentist has appointments at all 09:00–18:00 slots on date
- WHEN GET available-slots?date=2026-06-15
- THEN 200, `{ slots: [] }`

#### Scenario: CANCELLED appointments free slots
- GIVEN dentist has CANCELLED appointment at 10:00
- WHEN GET available-slots?date=2026-06-15
- THEN 200, "10:00" included as available

#### Scenario: Unauthenticated request denied
- WHEN GET without session cookie
- THEN 401

#### Scenario: Cross-tenant isolation
- GIVEN dentist "d2" has appointments on date
- WHEN dentist "d1" queries available-slots for same date
- THEN only d1's appointments block slots; d2's appointments invisible
