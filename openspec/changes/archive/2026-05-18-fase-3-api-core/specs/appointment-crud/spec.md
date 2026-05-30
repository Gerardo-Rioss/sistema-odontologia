# Appointment CRUD Specification

## Purpose
Full CRUD API for dental appointments. Multi-tenant isolation via session userId, Zod validation, status workflow (PENDING→CONFIRMED|CANCELLED|COMPLETED).

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

All list/read endpoints SHALL filter by session userId. DTOs validated with Spanish error messages.

R2: Body MUST include `patientId`, `date` (ISO date), `time` (HH:mm), `type` (LIMPIEZA|REVISION|URGENCIA|TRATAMIENTO|OTRO). Optional: `notes`. Defaults status=PENDING, userId from session. Invalid data → 400 with field-level details.

R6: PENDING→CONFIRMED only. Other states → 409.

R7: PENDING or CONFIRMED → CANCELLED. Already CANCELLED → 409.

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
