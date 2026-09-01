# Proposal: Service Dependency Injection

## Intent

4 core services (`PatientService`, `AppointmentService`, `MedicalRecordService`, `AttachmentService`) have **zero unit tests** because `jest.mock()` is the only way to decouple them from repository singletons. Constructor injection enables constructor-injected mock injection — clean, explicit, and framework-free.

## Scope

### In Scope
- Define repository interfaces (`IPatientRepository`, `IAppointmentRepository`, `IMedicalRecordRepository`, `IAttachmentRepository`) capturing only methods each service actually calls
- Add constructor injection to 4 services (repos become constructor params)
- Create `createXxxService()` factory functions for each service
- Preserve singleton exports (`export const patientService = createPatientService()`) — zero changes to route handlers
- Write unit tests for all 4 services using constructor-injected mocks

### Out of Scope
- DI container (overkill for 10 services)
- Changes to route handlers or other services (AuthService, CalendarService already have tests)
- Extraction of direct Prisma access from repositories (separate deeper refactor)
- Changes to `IRepository<T>` base interface (it stays as-is)

## Capabilities

### New Capabilities
None — this is a pure refactor, no new spec-level behavior.

### Modified Capabilities
- `patient-crud`: No requirement changes. Constructor injection is an internal implementation detail; API contract is unchanged.
- `appointment-crud`: Same — no behavioral change.

## Approach

**Constructor injection + factory functions.** Each service receives its repository dependencies via constructor. A factory function wires the real singletons. The existing `export const xxxService = ...` line switches from `new XxxService()` to `createXxxService()`.

### Interface Strategy

Define minimal interfaces in a new `src/services/types.ts` file, capturing only the methods each service calls. Do NOT extend `IRepository<T>` — those interfaces are narrower (e.g., `MedicalRecordRepository` has no `findById`, only `findByPatient` and `upsert`).

```typescript
// Example: PatientService needs only these
export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByDentist(userId: string): Promise<Patient[]>;
  findByIdWithAppointments(id: string, userId: string): Promise<Patient | null>;
  create(data: Partial<Patient>): Promise<Patient>;
  update(id: string, data: Partial<Patient>): Promise<Patient>;
  delete(id: string): Promise<void>;
}
```

### Transformation Pattern

Before:
```typescript
import { appointmentRepository } from "@/repositories/appointment.repository";
export class AppointmentService {
  async schedule(...) { return appointmentRepository.create({ ... }); }
}
export const appointmentService = new AppointmentService();
```

After:
```typescript
import type { IAppointmentRepository } from "./types";
export class AppointmentService {
  constructor(private readonly repo: IAppointmentRepository) {}
  async schedule(...) { return this.repo.create({ ... }); }
}
export function createAppointmentService(): AppointmentService {
  return new AppointmentService(appointmentRepository);
}
export const appointmentService = createAppointmentService();
```

### Test Pattern

```typescript
import { AppointmentService } from "@/services/appointment.service";
const mockRepo = { findById: jest.fn(), findByDentist: jest.fn(), ... };
const service = new AppointmentService(mockRepo);
```

No `jest.mock()` calls needed. Pure constructor injection.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/services/types.ts` | New | Repository interface definitions |
| `src/services/patient.service.ts` | Modified | Constructor injection, factory function |
| `src/services/appointment.service.ts` | Modified | Constructor injection, factory function |
| `src/services/medical-record.service.ts` | Modified | Constructor injection, factory function |
| `src/services/attachment.service.ts` | Modified | Constructor injection, factory function |
| `tests/unit/services/` | New | Unit tests for all 4 services |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Interface drift — service uses repo method not in interface | Low | Tests fail fast; interface is derived from actual usage |
| Singleton export breaks at import sites | Low | Export signature unchanged (`patientService` name preserved) |
| Overhead of maintaining interface files | Low | 4 small interfaces, ~8 methods total — trivial maintenance |

## Rollback Plan

Revert each service file to the `new XxxService()` singleton pattern. Remove `src/services/types.ts`. Delete test files. No migration or data changes involved.

## Dependencies

None — pure refactor with no external dependencies.

## Success Criteria

- [ ] All 4 services accept repos via constructor
- [ ] Factory functions create services with real singleton repos
- [ ] Singleton exports preserved — `npm run build` passes
- [ ] All existing tests pass (`npm test`)
- [ ] New unit tests for all 4 services using constructor-injected mocks
- [ ] Zero `jest.mock()` calls in new tests
