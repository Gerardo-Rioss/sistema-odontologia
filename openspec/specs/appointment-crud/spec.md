# Appointment CRUD Specification

## Purpose
Full CRUD API for dental appointments. Multi-tenant isolation via session userId, Zod validation, status workflow (PENDING→CONFIRMED|CANCELLED|COMPLETED). Calendar sync side-effects triggered async on mutations.

## Requirements

| # | Requirement | Method | Success | Auth | Owner | NF |
|---|------------|--------|---------|------|-------|-----|
| R1 | List dentist's appointments | GET /api/appointments | 200 | 401 | — | — |
| R2 | Create appointment (Zod) | POST /api/appointments | 201 | 401 | — | — |
| R3 | Get single appointment | GET /api/appointments/[id] | 200 | 401 | 403 | 404 |
| R4 | Update appointment (Zod) | PUT /api/appointments/[id] | 200 | 401 | 403 | 404 |
| R5 | Delete appointment | DELETE /api/appointments/[id] | 200 | 401 | 403 | 404 |
| R6 | Confirm appointment | PATCH /api/appointments/[id]/confirm | 200 | 401 | 403 | 404 |
| R7 | Cancel appointment | PATCH /api/appointments/[id]/cancel | 200 | 401 | 403 | 404 |
| R8 | Calendar Sync Side-Effect | — | — | — | — | — |
| R9 | Query available slots | GET /api/appointments/available-slots | 200 | 401 | — | — |

All list/read endpoints SHALL filter by session userId. DTOs validated with Spanish error messages.

R2: Body MUST include `patientId`, `date` (ISO date), `time` (HH:mm), `type` (LIMPIEZA|REVISION|URGENCIA|TRATAMIENTO|OTRO). Optional: `notes`. Defaults status=PENDING, userId from session. Invalid data → 400 with field-level details.

R6: PENDING→CONFIRMED only. Other states → 409.

R7: PENDING or CONFIRMED → CANCELLED. Already CANCELLED → 409.

R8: After create, update, or delete operations commit, the system MUST trigger calendar sync asynchronously. Sync failure SHALL NOT affect the API response.

### Scenarios

#### Scenario: Create valid appointment
- GIVEN session userId="d1", patient "p1" exists
- WHEN POST {date:"2026-06-01", time:"10:00", type:"LIMPIEZA"}
- THEN 201, status=PENDING, userId="d1"

#### Scenario: Cross-tenant access blocked
- GIVEN appointment "a1" owned by dentist "d2"
- WHEN dentist "d1" calls GET /api/appointments/a1
- THEN 403

#### Scenario: Invalid time format rejected
- WHEN POST appointment with time:"10:00:00"
- THEN 400, details include "Hora inválida (HH:mm)"

#### Scenario: Confirm-then-cancel workflow
- GIVEN appointment status=PENDING
- WHEN PATCH confirm → THEN status=CONFIRMED
- WHEN PATCH cancel → THEN status=CANCELLED

#### Scenario: Create triggers outbound sync
- GIVEN CalendarConnection ACTIVE, valid appointment payload
- WHEN `POST /api/appointments` returns 201
- THEN `CalendarService.createEvent()` called async; `googleEventId` stored on appointment record

#### Scenario: Update triggers outbound sync
- GIVEN appointment has `googleEventId="evt-abc"`, CalendarConnection ACTIVE
- WHEN `PUT /api/appointments/[id]` returns 200
- THEN `CalendarService.updateEvent("evt-abc", changes)` called async

#### Scenario: Delete triggers outbound sync
- GIVEN appointment has `googleEventId="evt-abc"`, CalendarConnection ACTIVE
- WHEN `DELETE /api/appointments/[id]` returns 200
- THEN `CalendarService.deleteEvent("evt-abc")` called async

#### Scenario: Sync failure does not block create
- GIVEN Google Calendar API unreachable
- WHEN `POST /api/appointments` executed
- THEN 201 returned immediately, sync failure logged, retry queued

#### Scenario: Confirm triggers sync
- GIVEN appointment status=PENDING, CalendarConnection ACTIVE
- WHEN `PATCH /api/appointments/[id]/confirm` returns 200
- THEN Google event updated with status=CONFIRMED via async sync

#### Scenario: Cancel triggers sync
- GIVEN appointment status=PENDING or CONFIRMED, CalendarConnection ACTIVE
- WHEN `PATCH /api/appointments/[id]/cancel` returns 200
- THEN Google event updated with status=CANCELLED via async sync

#### Scenario: No calendar connection — no sync attempted
- GIVEN no ACTIVE CalendarConnection for dentist
- WHEN any appointment mutation succeeds
- THEN no sync triggered, no error

---

### Requirement: Available Slots Query

The system SHALL expose `GET /api/appointments/available-slots` returning free time slots for a given date.

| Param | Required | Description |
|-------|----------|-------------|
| date | YES | ISO date (YYYY-MM-DD) |
| serviceType | No | AppointmentType filter (reserved) |

Response: `{ slots: [{ time: "HH:mm" }] }`. Slots generated from business hours in 1-hour blocks (08:00–18:00, excluding lunch 13:00–14:00). SHALL exclude slots occupied by PENDING or CONFIRMED appointments. CANCELLED appointments do NOT block slots.

Auth: MUST require valid session (401 if missing). Authorization: SHALL filter to session userId's appointments only — no cross-tenant slot leakage.

#### Scenario: Query available slots for date
- GIVEN dentist has CONFIRMED appointment at 10:00 on 2026-06-15
- WHEN GET /api/appointments/available-slots?date=2026-06-15
- THEN 200, slots array excludes "10:00", includes "09:00", "11:00", etc. through "18:00"

#### Scenario: All slots booked
- GIVEN dentist has appointments at all available slots on date
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
