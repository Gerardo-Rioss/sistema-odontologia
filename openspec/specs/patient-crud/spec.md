# Patient CRUD Specification

## Purpose
Full CRUD API for patients with multi-tenant isolation and hard-cascade-delete of appointments.

## Requirements

| # | Requirement | Method | Success | Auth | Owner | NF |
|---|------------|--------|---------|------|-------|-----|
| R1 | List dentist's patients | GET /api/patients | 200 | 401 | — | — |
| R2 | Create patient (Zod) | POST /api/patients | 201 | 401 | — | — |
| R3 | Get patient + history | GET /api/patients/[id] | 200 | 401 | 403 | 404 |
| R4 | Update patient (Zod) | PUT /api/patients/[id] | 200 | 401 | 403 | 404 |
| R5 | Delete patient (cascade) | DELETE /api/patients/[id] | 200 | 401 | 403 | 404 |

R2: Body MUST include `name`, `phone`. Optional: `email` (valid format), `birthDate` (ISO), `notes`. Sets userId from session. Spanish error messages on Zod failure.

R3: Response SHALL include `{patient, appointments[]}` — patient data with full appointment history.

R5: Hard-deletes patient AND all their appointments via Prisma cascade. Returns `{success:true, data:null}`.

### Scenarios

#### Scenario: Minimal patient creation
- GIVEN session userId="d1"
- WHEN POST {name:"María López", phone:"555-0101"}
- THEN 201, userId="d1"

#### Scenario: Cross-tenant access blocked
- GIVEN patient "p1" owned by dentist "d2"
- WHEN dentist "d1" calls GET/PUT/DELETE /api/patients/p1
- THEN 403

#### Scenario: Cascade integrity on delete
- GIVEN patient "p1" owned by "d1" has 3 appointments
- WHEN DELETE /api/patients/p1 as dentist "d1"
- THEN 200, patient AND all 3 appointments removed from database
