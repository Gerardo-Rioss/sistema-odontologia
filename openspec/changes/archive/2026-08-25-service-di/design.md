# Design: Service Dependency Injection

## Technical Approach

Constructor injection on 4 core services to eliminate `jest.mock()` dependency. Each service receives repository interfaces via constructor. Factory functions wire real singletons. Existing `export const xxxService` signatures stay identical — zero route handler changes.

## Architecture Decisions

### Decision: Minimal interfaces per service

**Choice**: Define narrow interfaces in `src/services/types.ts` capturing only methods each service actually calls.

**Alternatives considered**: Extend `IRepository<T>` from `base.repository.ts` — it includes `findAll`, `findById`, `create`, `update`, `delete` generically.

**Rationale**: `MedicalRecordService` calls only `findByPatient` + `upsert` — no `findById`, no `create`. `AttachmentService` calls `findByPatient`, `findById`, `create`, `delete` — no `update`. Minimal interfaces match actual usage and prevent accidental coupling to unused methods.

### Decision: IFileStorage abstraction for AttachmentService

**Choice**: Define `IFileStorage` interface wrapping `fs.mkdir`, `fs.writeFile`, `fs.unlink`.

**Alternatives considered**: Inject `fs/promises` directly; skip abstraction since it's "just file I/O".

**Rationale**: Testing without `jest.mock("fs/promises")` requires an abstraction. The interface is 3 methods — trivial overhead. Production wiring uses real `fs/promises`; tests inject a plain object literal.

### Decision: Factory functions + singleton exports

**Choice**: `createXxxService()` factory returns `new XxxService(deps)`; `export const xxxService = createXxxService()`.

**Alternatives considered**: Direct `new XxxService()` at export; DI container.

**Rationale**: Factory functions enable test-friendly construction while preserving the singleton pattern route handlers already import. DI container is overkill for 4 services.

## Data Flow

```
Route Handler ──→ patientService (singleton)
                      │
                      ▼
              PatientService(repo)
                      │
                      ▼
              IPatientRepository
                      │
                      ▼
              PatientRepository (Prisma)
```

Same pattern for all 4 services. `MedicalRecordService` and `AttachmentService` each receive `IPatientRepository` for ownership checks alongside their primary repository.

## Interfaces / Contracts

```typescript
// src/services/types.ts
import type { Patient, Appointment, MedicalRecord, Attachment } from "@prisma/client";

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByDentist(userId: string): Promise<Patient[]>;
  findByIdWithAppointments(id: string, userId: string): Promise<Patient | null>;
  create(data: Partial<Patient>): Promise<Patient>;
  update(id: string, data: Partial<Patient>): Promise<Patient>;
  delete(id: string): Promise<void>;
}

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findByDentist(userId: string): Promise<(Appointment & { patient: { id: string; name: string } | null })[]>;
  create(data: Partial<Appointment>): Promise<Appointment>;
  update(id: string, data: Partial<Appointment>): Promise<Appointment>;
  delete(id: string): Promise<void>;
}

export interface IMedicalRecordRepository {
  findByPatient(patientId: string): Promise<MedicalRecord | null>;
  upsert(patientId: string, data: Partial<MedicalRecord>): Promise<MedicalRecord>;
}

export interface IAttachmentRepository {
  findById(id: string): Promise<Attachment | null>;
  findByPatient(patientId: string): Promise<Attachment[]>;
  create(data: { patientId: string; userId: string; fileName: string; fileType: string; fileSize: number; filePath: string; category: string | null; notes: string | null }): Promise<Attachment>;
  delete(id: string): Promise<void>;
}

export interface IFileStorage {
  mkdir(dir: string, opts?: { recursive?: boolean }): Promise<void>;
  writeFile(path: string, data: Buffer): Promise<void>;
  unlink(path: string): Promise<void>;
}
```

**Method inventory** (why each method is on the interface):

| Service | Method | Calls on repo |
|---------|--------|---------------|
| PatientService | `create` | `patientRepo.create` |
| PatientService | `update` | `patientRepo.findById`, `patientRepo.update` |
| PatientService | `getAll` | `patientRepo.findByDentist` |
| PatientService | `getById` | `patientRepo.findById`, `patientRepo.findByIdWithAppointments` |
| PatientService | `delete` | `patientRepo.findById`, `patientRepo.delete` |
| AppointmentService | `schedule` | `appointmentRepo.create`, `appointmentRepo.findByDentist` |
| AppointmentService | `reschedule` | `appointmentRepo.findById`, `appointmentRepo.findByDentist`, `appointmentRepo.update` |
| AppointmentService | `cancel` | `appointmentRepo.findById`, `appointmentRepo.update` |
| AppointmentService | `confirm` | `appointmentRepo.findById`, `appointmentRepo.update` |
| AppointmentService | `getAll` | `appointmentRepo.findByDentist` |
| AppointmentService | `getById` | `appointmentRepo.findById` |
| AppointmentService | `delete` | `appointmentRepo.findById`, `appointmentRepo.delete` |
| MedicalRecordService | `getByPatient` | `medicalRecordRepo.findByPatient`, `patientRepo.findById` |
| MedicalRecordService | `upsert` | `medicalRecordRepo.upsert`, `patientRepo.findById` |
| AttachmentService | `getByPatient` | `attachmentRepo.findByPatient`, `patientRepo.findById` |
| AttachmentService | `upload` | `attachmentRepo.create`, `patientRepo.findById`, `fileStorage.*` |
| AttachmentService | `delete` | `attachmentRepo.findById`, `attachmentRepo.delete`, `patientRepo.findById`, `fileStorage.unlink` |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/types.ts` | Create | 5 interfaces: `IPatientRepository`, `IAppointmentRepository`, `IMedicalRecordRepository`, `IAttachmentRepository`, `IFileStorage` |
| `src/services/patient.service.ts` | Modify | Add constructor injection, replace `patientRepository` references with `this.patientRepo`, add factory function |
| `src/services/appointment.service.ts` | Modify | Add constructor injection, replace `appointmentRepository` references with `this.appointmentRepo`, add factory function |
| `src/services/medical-record.service.ts` | Modify | Add constructor injection for `medicalRecordRepo` + `patientRepo`, add factory function |
| `src/services/attachment.service.ts` | Modify | Add constructor injection for `attachmentRepo` + `patientRepo` + `fileStorage`, add factory function |
| `tests/unit/services/patient.service.test.ts` | Create | Unit tests: create, update (ownership verified, not found), getAll (with search filter), getById (ownership), delete |
| `tests/unit/services/appointment.service.test.ts` | Create | Unit tests: schedule (conflict detection), reschedule, cancel, confirm (state guards), getAll (filters), getById, delete |
| `tests/unit/services/medical-record.service.test.ts` | Create | Unit tests: getByPatient (ownership), upsert (ownership + cleanData) |
| `tests/unit/services/attachment.service.test.ts` | Create | Unit tests: getByPatient, upload (file write + DB), delete (file unlink + DB), ownership checks |

## Transformation Pattern

**Before** (hardcoded singleton import):
```typescript
import { patientRepository } from "@/repositories/patient.repository";
export class PatientService {
  async create(...) { return patientRepository.create({...}); }
}
export const patientService = new PatientService();
```

**After** (constructor injection + factory):
```typescript
import type { IPatientRepository } from "./types";
import { patientRepository } from "@/repositories/patient.repository";

export class PatientService {
  constructor(private readonly patientRepo: IPatientRepository) {}
  async create(...) { return this.patientRepo.create({...}); }
}

export function createPatientService(): PatientService {
  return new PatientService(patientRepository);
}
export const patientService = createPatientService();
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each service method in isolation | Constructor-injected mock objects with `jest.fn()` methods. No `jest.mock()`. Mock repos are plain object literals. |
| Integration | Not changed | Existing integration tests remain. Route handlers unchanged. |
| E2E | Not changed | Existing Playwright tests remain. |

**Test patterns:**
- Mock repos created as `const mockRepo = { findById: jest.fn(), ... } satisfies IPatientRepository`
- Service instantiated via `new PatientService(mockRepo)`
- Each test resets mocks with `jest.clearAllMocks()` in `beforeEach`
- Tests cover: happy path, not-found (404), ownership denied (403), business rule violations (conflict, wrong state)

**Auth.service.ts note**: `AuthService` already has tests using `jest.mock()`. It is explicitly out of scope — constructor injection is not applied to it.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. This is a pure refactor:
- Singleton exports (`patientService`, `appointmentService`, etc.) keep their names
- Route handlers import unchanged
- `npm run build` validates wiring
- All existing tests must pass after refactor

## Open Questions

None — the proposal is clear and the codebase confirms the approach. All method signatures are extracted from actual source.
