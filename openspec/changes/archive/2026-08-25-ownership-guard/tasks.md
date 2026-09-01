# Tasks: Ownership Guard — Consolidate verifyOwnership

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 (15 utility + 50 tests + 35 service diffs) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Ownership utility + tests + refactors | Single PR | `npm test -- --testPathPattern=ownership` | N/A — pure utility, no runtime harness needed | Revert all 6 files (ownership.ts + 4 services + test) |

## Phase 1: Foundation — Shared Utility

- [x] 1.1 Create `src/lib/ownership.ts` — export `verifyOwnership<T>(fetchFn, id, userId, notFoundMessage, forbiddenMessage): Promise<T>` with null check → throw notFoundMessage, userId mismatch → throw forbiddenMessage, else return entity
- [x] 1.2 Create `src/lib/__tests__/ownership.test.ts` — RED tests: entity found+owned returns entity, null fetchFn throws notFoundMessage, mismatched userId throws forbiddenMessage, custom error messages match exactly

## Phase 2: Core Implementation — Service Refactors

- [x] 2.1 Refactor `src/services/patient.service.ts` — replace private `verifyPatientOwnership` body with `return verifyOwnership(this.patientRepo.findById.bind(this.patientRepo), id, userId, "Paciente no encontrado", "No tiene permiso para acceder a este paciente")`
- [x] 2.2 Refactor `src/services/appointment.service.ts` — replace private `verifyOwnership` body with `return verifyOwnership(this.appointmentRepo.findById.bind(this.appointmentRepo), id, userId, "Cita no encontrada", "No tiene permiso para acceder a esta cita")`
- [x] 2.3 Refactor `src/services/medical-record.service.ts` — replace private `verifyPatientOwnership` body with `await verifyOwnership(this.patientRepo.findById.bind(this.patientRepo), patientId, userId, "Paciente no encontrado", "No tiene permiso para acceder a este paciente")`
- [x] 2.4 Refactor `src/services/attachment.service.ts` — replace private `verifyPatientOwnership` body with `await verifyOwnership(this.patientRepo.findById.bind(this.patientRepo), patientId, userId, "Paciente no encontrado", "No tiene permiso para acceder a este paciente")`

## Phase 3: Verification

- [x] 3.1 Run `npm test` — all existing service tests pass unchanged (no test file modifications)
- [x] 3.2 Run `npm run build` — TypeScript compiles with no errors
- [x] 3.3 Verify error message strings unchanged — grep for "Paciente no encontrado", "No tiene permiso" in services to confirm exact preservation
