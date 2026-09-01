# Service Dependency Injection Specification

> **Status**: ✅ Implemented — archived 2026-08-25

## Purpose

Enable constructor-based dependency injection for 4 core services (`PatientService`, `AppointmentService`, `MedicalRecordService`, `AttachmentService`), replacing singleton repository imports. This eliminates `jest.mock()` coupling, enabling pure unit tests with constructor-injected mocks.

## Requirements

### Requirement: PatientService Constructor Injection

The `PatientService` class SHALL accept `IPatientRepository` via its constructor. All repository access SHALL use `this.patientRepo` instead of imported singletons.

#### Scenario: findById returns patient via injected repo
- GIVEN `PatientService` instantiated with a mock `IPatientRepository` where `findById("p1")` returns `{id:"p1", name:"Ana"}`
- WHEN `service.findById("p1")` is called
- THEN the mock's `findById` is invoked with `"p1"`
- AND the returned patient matches `{id:"p1", name:"Ana"}`

#### Scenario: verifyPatientOwnership throws for wrong owner
- GIVEN `PatientService` with mock repo where `findById("p1")` returns `{id:"p1", userId:"d2"}`
- WHEN `service.verifyPatientOwnership("p1", "d1")` is called
- THEN a `PatientNotFoundError` or ownership error is thrown

### Requirement: AppointmentService Constructor Injection

The `AppointmentService` class SHALL accept `IAppointmentRepository` via its constructor. The `checkTimeConflict` method SHALL use `this.appointmentRepo.findByDentist()`.

#### Scenario: schedule detects time conflict
- GIVEN `AppointmentService` with mock repo where `findByDentist("d1")` returns `[{date:"2026-06-01", time:"10:00"}]`
- WHEN `service.schedule({userId:"d1", date:"2026-06-01", time:"10:00", ...})` is called
- THEN a time conflict error is thrown
- AND no `create` call is made on the mock repo

#### Scenario: schedule creates appointment
- GIVEN `AppointmentService` with mock repo where `findByDentist("d1")` returns `[]` (no conflict)
- WHEN `service.schedule({userId:"d1", patientId:"p1", date:"2026-06-01", time:"10:00", type:"LIMPIEZA"})` is called
- THEN `create` is called on the mock repo with the appointment data
- AND the created appointment is returned

### Requirement: MedicalRecordService Constructor Injection

The `MedicalRecordService` class SHALL accept `IMedicalRecordRepository` and `IPatientRepository` via its constructor (two repository dependencies).

#### Scenario: getOrCreate finds existing record
- GIVEN `MedicalRecordService` with mock repos where `medicalRecordRepo.findByPatientId("p1")` returns `{id:"mr1"}`
- WHEN `service.getOrCreate("p1")` is called
- THEN the existing record `{id:"mr1"}` is returned
- And no `create` call is made

#### Scenario: getOrCreate creates new record
- GIVEN `MedicalRecordService` with mock repos where `findByPatientId("p1")` returns `null` and `create` returns `{id:"mr2", patientId:"p1"}`
- WHEN `service.getOrCreate("p1")` is called
- THEN `create` is called with `{patientId: "p1"}`
- And the new record `{id:"mr2", patientId:"p1"}` is returned

### Requirement: AttachmentService Constructor Injection

The `AttachmentService` class SHALL accept `IAttachmentRepository`, `IPatientRepository`, and `IFileStorage` via its constructor (three dependencies).

#### Scenario: upload creates file and record
- GIVEN `AttachmentService` with mock repos and mock file storage where `fileStorage.writeFile` resolves to `/uploads/f1.pdf`
- WHEN `service.upload("p1", fileBuffer, "f1.pdf")` is called
- THEN `fileStorage.writeFile` is called with the file content
- And `attachmentRepo.create` is called with `{patientId: "p1", path: "/uploads/f1.pdf", originalName: "f1.pdf"}`

#### Scenario: delete removes file and record
- GIVEN `AttachmentService` with mock repos where `attachmentRepo.findById("a1")` returns `{id:"a1", path:"/uploads/f1.pdf", patientId:"p1"}`
- WHEN `service.delete("a1")` is called
- THEN `fileStorage.unlink("/uploads/f1.pdf")` is called
- And `attachmentRepo.delete("a1")` is called

### Requirement: Repository Interface Contracts

The system SHALL define minimal service-specific interfaces in `src/services/types.ts`. Each interface SHALL contain only the methods that the corresponding service actually invokes. Interfaces MUST NOT extend `IRepository<T>`.

| Interface | Methods |
|-----------|---------|
| `IPatientRepository` | `findById`, `create`, `update`, `delete`, `findByDentist` |
| `IAppointmentRepository` | `findById`, `create`, `update`, `delete`, `findByDentist`, `findByIdWithPatient` |
| `IMedicalRecordRepository` | `findById`, `findByPatientId`, `create`, `update` |
| `IAttachmentRepository` | `findById`, `findByPatientId`, `create`, `delete` |
| `IFileStorage` | `writeFile`, `unlink`, `mkdir` |

### Requirement: Factory Functions and Singleton Preservation

Each service SHALL expose a `createXxxService()` factory function that wires the real repository singletons. The existing `export const xxxService = ...` line SHALL switch from `new XxxService()` to `createXxxService()`. Import sites MUST NOT require changes.

#### Scenario: Factory functions wire real repositories
- GIVEN `createPatientService()` is called in a Node.js context where Prisma client is available
- WHEN the factory executes
- THEN it returns a `PatientService` instance with the real `patientRepository` injected
- And the service is fully functional (can perform CRUD operations)

#### Scenario: Singleton exports preserved for backward compatibility
- GIVEN the application is built (`npm run build`)
- WHEN existing route handlers import `patientService`, `appointmentService`, `medicalRecordService`, or `attachmentService`
- THEN all imports resolve without errors
- And existing behavior is unchanged
