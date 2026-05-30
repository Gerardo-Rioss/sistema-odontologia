# Tasks: API Core — Appointments & Patients CRUD

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1110 (across 14 files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + Types + DTOs + Repos | PR 1 (~280 lines) | Foundation layer; no runtime deps beyond Prisma |
| 2 | AppointmentService + PatientService | PR 2 (~330 lines) | Business logic; depends on repos from PR 1 |
| 3 | Appointment route handlers (7 endpoints) | PR 3 (~390 lines) | GET/POST/PUT/DELETE + PATCH confirm + PATCH cancel |
| 4 | Patient route handlers (5 endpoints) | PR 4 (~240 lines) | GET/POST/PUT/DELETE with cascade-delete |

## Phase 1: Schema + Types + DTOs + Repos

- [x] 1.1 Update `prisma/schema.prisma`: replace AppointmentStatus SCHEDULED→PENDING, add AppointmentType enum (LIMPIEZA|REVISION|URGENCIA|TRATAMIENTO|OTRO), change Appointment.type field to AppointmentType, add Message model with named relations
- [x] 1.2 Run `npx prisma migrate dev --name add-message-and-enums` (migration SQL generated manually; DB unavailable)
- [x] 1.3 Update `src/types/index.ts`: add PENDING to AppointmentStatus, add time/type to Appointment, add userId/updatedAt/notes to Patient, add AppointmentType type
- [x] 1.4 Rewrite `src/lib/validations.ts`: CreateAppointmentDTO (dateTime→date+time+type enum), CreatePatientDTO (firstName+lastName→name), UpdateAppointmentDTO (date+time+status fields), add UpdatePatientDTO (name/phone/email/birthDate/notes partial)
- [x] 1.5 Create `src/repositories/appointment.repository.ts`: IRepository<Appointment> + findByDentist(userId), findByIdWithPatient(id, userId) — all queries filter userId
- [x] 1.6 Create `src/repositories/patient.repository.ts`: IRepository<Patient> + findByDentist(userId), findByIdWithAppointments(id, userId)

## Phase 2: Services

- [x] 2.1 Rewrite `src/services/appointment.service.ts`: schedule (repo.findByDate conflict→409), reschedule, cancel (status→CANCELLED, guard 409 if already cancelled), confirm (PENDING→CONFIRMED, guard 409 if not PENDING), getAll (repo.findAllByUser with patient include), getById (cross-tenant guard)
- [x] 2.2 Rewrite `src/services/patient.service.ts`: create, update, getAll (repo.findAllByUser), getById (include:appointments), delete (hard delete, cascade via Prisma onDelete), search

## Phase 3: Appointment Route Handlers

- [x] 3.1 Rewrite `src/app/api/appointments/route.ts`: GET (auth→session.userId→service.getAll→200), POST (auth+Zod→service.schedule→201)
- [x] 3.2 Rewrite `src/app/api/appointments/[id]/route.ts`: GET byId (auth, 403 cross-tenant, 404 not found), PUT update (auth+Zod→service.reschedule), DELETE (auth, 403/404 guard)
- [x] 3.3 Create `src/app/api/appointments/[id]/confirm/route.ts`: PATCH (auth→service.confirm→200 | 409)
- [x] 3.4 Create `src/app/api/appointments/[id]/cancel/route.ts`: PATCH (auth→service.cancel→200 | 409)

## Phase 4: Patient Route Handlers

- [x] 4.1 Rewrite `src/app/api/patients/route.ts`: GET (auth→service.getAll→200, ?search= query param), POST (auth+Zod→service.create→201)
- [x] 4.2 Rewrite `src/app/api/patients/[id]/route.ts`: GET byId (auth, include appointments in response, 403/404), PUT update (auth+Zod→service.update), DELETE (auth→service.delete→204 No Content, cascade)

## Phase 5: Tests (write only — TDD disabled)

- [ ] 5.1 Write `tests/validations.test.ts`: DTOs reject missing name/phone/patientId, bad email, invalid HH:mm time format, empty strings
- [ ] 5.2 Write `tests/services/appointment.test.ts`: mock repo; test schedule 409 on time conflict, confirm 409 on CANCELLED, cancel 409 on already CANCELLED
- [ ] 5.3 Write `tests/services/patient.test.ts`: mock repo; test create with minimal fields, getById returns {patient, appointments[]}, delete cascade
- [ ] 5.4 Write `tests/routes/appointments.test.ts`: 401 without session, 201 valid create, 403 cross-tenant read, 404 missing id, confirm-then-cancel workflow
- [ ] 5.5 Write `tests/routes/patients.test.ts`: 401 without session, create→201, get with history includes appointments[], cascade delete removes appointments
