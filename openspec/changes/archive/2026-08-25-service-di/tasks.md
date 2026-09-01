# Tasks: Service Dependency Injection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-500 net (~40 interfaces, ~80 service modifications, ~350 tests) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Interfaces + service refactors + factory functions | PR 1 | `npm run type-check` | `npm run dev` | src/services/types.ts, src/services/*.service.ts |
| 2 | Unit tests for all 4 services | PR 1 | `npm test` | `npm run dev` | tests/unit/services/*.test.ts |

## Phase 1: Foundation — Interfaces and Type Contracts

- [x] 1.1 Create `src/services/types.ts` with 5 interfaces: `IPatientRepository` (findById, findByDentist, findByIdWithAppointments, create, update, delete), `IAppointmentRepository` (findById, findByDentist, create, update, delete), `IMedicalRecordRepository` (findByPatient, upsert), `IAttachmentRepository` (findById, findByPatient, create, delete), `IFileStorage` (mkdir, writeFile, unlink)
- [x] 1.2 Verify interfaces match actual method signatures from `src/repositories/` and `src/services/` source — cross-check param types and return types

## Phase 2: Service Refactoring — Constructor Injection + Factories

- [x] 2.1 Refactor `src/services/patient.service.ts`: add `constructor(private readonly patientRepo: IPatientRepository)`, replace 5 `patientRepository.*` calls with `this.patientRepo.*`, add `createPatientService()` factory wiring real `patientRepository`, change export to `createPatientService()`
- [x] 2.2 Refactor `src/services/appointment.service.ts`: add `constructor(private readonly appointmentRepo: IAppointmentRepository)`, replace 6 `appointmentRepository.*` calls with `this.appointmentRepo.*`, add `createAppointmentService()` factory, change export
- [x] 2.3 Refactor `src/services/medical-record.service.ts`: add `constructor(private readonly medicalRecordRepo: IMedicalRecordRepository, private readonly patientRepo: IPatientRepository)`, replace `medicalRecordRepository.*` → `this.medicalRecordRepo.*` and `patientRepository.*` → `this.patientRepo.*`, add `createMedicalRecordService()` factory, change export
- [x] 2.4 Refactor `src/services/attachment.service.ts`: add `constructor(private readonly attachmentRepo: IAttachmentRepository, private readonly patientRepo: IPatientRepository, private readonly fileStorage: IFileStorage)`, replace `attachmentRepository.*` → `this.attachmentRepo.*`, `patientRepository.*` → `this.patientRepo.*`, `fs.*` → `this.fileStorage.*`, add `createAttachmentService()` factory, change export
- [x] 2.5 Run `npm run type-check` — zero new errors, all constructor signatures match interfaces

## Phase 3: Unit Tests — PatientService

- [x] 3.1 Create `tests/unit/services/patient.service.test.ts` with `mockPatientRepo` satisfying `IPatientRepository`
- [x] 3.2 Test `create`: mock `patientRepo.create` returns patient, verify call with mapped DTO fields
- [x] 3.3 Test `update`: mock ownership verification + `patientRepo.update`, verify mapped update data
- [x] 3.4 Test `update` ownership denied: `patientRepo.findById` returns patient with different `userId` → throws ownership error
- [x] 3.5 Test `update` not found: `patientRepo.findById` returns null → throws not-found error
- [x] 3.6 Test `getAll`: mock `patientRepo.findByDentist`, verify search filter works (case-insensitive partial match)
- [x] 3.7 Test `getById`: mock ownership verification + `patientRepo.findByIdWithAppointments`, verify returns patient with appointments
- [x] 3.8 Test `delete`: mock ownership verification + `patientRepo.delete`, verify deletion called
- [x] 3.9 Run `npm test -- tests/unit/services/patient.service.test.ts` — all tests pass

## Phase 4: Unit Tests — AppointmentService

- [x] 4.1 Create `tests/unit/services/appointment.service.test.ts` with `mockAppointmentRepo` satisfying `IAppointmentRepository`
- [x] 4.2 Test `schedule`: mock `findByDentist` returns empty array (no conflict), `create` returns appointment
- [x] 4.3 Test `schedule` conflict: `findByDentist` returns existing appointment at same date+time → throws conflict error, `create` NOT called
- [x] 4.4 Test `reschedule`: mock ownership + `findByDentist` (no conflict) + `update`, verify new date/time applied
- [x] 4.5 Test `cancel`: mock ownership verification (status PENDING), `update` sets CANCELLED
- [x] 4.6 Test `cancel` already cancelled: appointment status CANCELLED → throws already-cancelled error
- [x] 4.7 Test `confirm`: mock ownership (status PENDING), `update` sets CONFIRMED
- [x] 4.8 Test `confirm` wrong status: appointment status CONFIRMED → throws not-pending error
- [x] 4.9 Test `getAll`: mock `findByDentist`, verify status/date/search filters
- [x] 4.10 Test `getById`: mock ownership verification, verify appointment returned
- [x] 4.11 Test `delete`: mock ownership + `delete` called
- [x] 4.12 Run `npm test -- tests/unit/services/appointment.service.test.ts` — all tests pass

## Phase 5: Unit Tests — MedicalRecordService

- [x] 5.1 Create `tests/unit/services/medical-record.service.test.ts` with `mockMedicalRecordRepo` and `mockPatientRepo`
- [x] 5.2 Test `getByPatient`: ownership verified (patient exists, correct user), `medicalRecordRepo.findByPatient` returns record
- [x] 5.3 Test `getByPatient` ownership denied: patient belongs to different user → throws ownership error
- [x] 5.4 Test `getByPatient` not found: `patientRepo.findById` returns null → throws not-found error
- [x] 5.5 Test `upsert`: ownership verified, `medicalRecordRepo.upsert` called with cleaned data (only defined fields)
- [x] 5.6 Run `npm test -- tests/unit/services/medical-record.service.test.ts` — all tests pass

## Phase 6: Unit Tests — AttachmentService

- [x] 6.1 Create `tests/unit/services/attachment.service.test.ts` with `mockAttachmentRepo`, `mockPatientRepo`, `mockFileStorage`
- [x] 6.2 Test `getByPatient`: ownership verified, `attachmentRepo.findByPatient` returns attachments
- [x] 6.3 Test `upload`: ownership verified, `fileStorage.mkdir` + `fileStorage.writeFile` called, `attachmentRepo.create` called with correct data
- [x] 6.4 Test `upload` ownership denied: throws ownership error, no file ops or DB calls made
- [x] 6.5 Test `delete`: `attachmentRepo.findById` returns attachment, ownership verified, `fileStorage.unlink` called, `attachmentRepo.delete` called
- [x] 6.6 Test `delete` not found: `attachmentRepo.findById` returns null → throws not-found error
- [x] 6.7 Test `delete` file missing: `fileStorage.unlink` throws (file gone), deletion still succeeds (catch block)
- [x] 6.8 Run `npm test -- tests/unit/services/attachment.service.test.ts` — all tests pass

## Phase 7: Verification

- [x] 7.1 Run `npm test` — all existing 372+ tests + new tests pass
- [x] 7.2 Run `npm run type-check` — zero TypeScript errors (pre-existing error in components.test.tsx only)
- [x] 7.3 Verify singleton exports work: `npm run build` completes without import errors
