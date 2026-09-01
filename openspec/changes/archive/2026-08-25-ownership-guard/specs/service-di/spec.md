# Delta for Service Dependency Injection

## MODIFIED Requirements

### Requirement: PatientService Constructor Injection

The `PatientService` class SHALL accept `IPatientRepository` via its constructor. All repository access SHALL use `this.patientRepo` instead of imported singletons. Ownership verification SHALL use the shared `verifyOwnership` utility from `src/lib/ownership.ts` instead of a private method.

(Previously: PatientService had a private `verifyPatientOwnership` method with inline ownership logic)

#### Scenario: findById returns patient via injected repo

- GIVEN `PatientService` instantiated with a mock `IPatientRepository` where `findById("p1")` returns `{id:"p1", name:"Ana"}`
- WHEN `service.findById("p1")` is called
- THEN the mock's `findById` is invoked with `"p1"`
- AND the returned patient matches `{id:"p1", name:"Ana"}`

#### Scenario: verifyPatientOwnership throws for wrong owner

- GIVEN `PatientService` with mock repo where `findById("p1")` returns `{id:"p1", userId:"d2"}`
- WHEN `service.verifyPatientOwnership("p1", "d1")` is called
- THEN a `PatientNotFoundError` or ownership error is thrown
- AND the error message is `"No tiene permiso"`

#### Scenario: verifyPatientOwnership delegates to shared utility

- GIVEN `PatientService` using the shared `verifyOwnership` utility
- WHEN `service.verifyPatientOwnership("p1", "d1")` is called with a valid owned patient
- THEN the patient entity is returned
- AND no private ownership verification logic is executed

### Requirement: AppointmentService Constructor Injection

The `AppointmentService` class SHALL accept `IAppointmentRepository` via its constructor. The `checkTimeConflict` method SHALL use `this.appointmentRepo.findByDentist()`. Ownership verification SHALL use the shared `verifyOwnership` utility from `src/lib/ownership.ts` instead of a private method.

(Previously: AppointmentService had a private `verifyOwnership` method with inline ownership logic)

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

#### Scenario: verifyOwnership delegates to shared utility

- GIVEN `AppointmentService` using the shared `verifyOwnership` utility
- WHEN ownership is verified for an appointment
- THEN the shared utility handles the fetch and ownership check
- AND no private ownership verification logic is executed

### Requirement: MedicalRecordService Constructor Injection

The `MedicalRecordService` class SHALL accept `IMedicalRecordRepository` and `IPatientRepository` via its constructor (two repository dependencies). Ownership verification SHALL use the shared `verifyOwnership` utility from `src/lib/ownership.ts` instead of a private method.

(Previously: MedicalRecordService had a private `verifyPatientOwnership` method with inline ownership logic)

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

#### Scenario: verifyPatientOwnership delegates to shared utility

- GIVEN `MedicalRecordService` using the shared `verifyOwnership` utility
- WHEN `service.verifyPatientOwnership("p1", "d1")` is called
- THEN the shared utility performs the ownership check
- AND no private ownership verification logic is executed

### Requirement: AttachmentService Constructor Injection

The `AttachmentService` class SHALL accept `IAttachmentRepository`, `IPatientRepository`, and `IFileStorage` via its constructor (three dependencies). Ownership verification SHALL use the shared `verifyOwnership` utility from `src/lib/ownership.ts` instead of a private method.

(Previously: AttachmentService had a private `verifyPatientOwnership` method with inline ownership logic)

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

#### Scenario: verifyPatientOwnership delegates to shared utility

- GIVEN `AttachmentService` using the shared `verifyOwnership` utility
- WHEN `service.verifyPatientOwnership("p1", "d1")` is called
- THEN the shared utility performs the ownership check
- AND no private ownership verification logic is executed
