# Proposal: Consolidate verifyOwnership into Shared Guard

## Intent

Four services copy-paste identical ownership verification logic: fetch entity by ID → null check → userId mismatch check → throw. The only variables are entity type, error messages, and return type. This duplication violates DRY, makes maintenance error-prone (a bug fix in one service can be missed in others), and adds cognitive load when reading each service. Consolidating into a single utility eliminates ~40 lines of identical private methods and centralizes the security-critical ownership check.

## Scope

### In Scope
- Create `src/lib/ownership.ts` with a generic `verifyOwnership<T>()` utility function
- Modify `PatientService` to use the shared utility (returns `Patient`)
- Modify `AppointmentService` to use the shared utility (returns `Appointment`)
- Modify `MedicalRecordService` to use the shared utility (returns `void`)
- Modify `AttachmentService` to use the shared utility (returns `void`)
- Add unit tests for `verifyOwnership()` in `src/lib/__tests__/ownership.test.ts`
- Preserve all existing error messages and behavior exactly

### Out of Scope
- No changes to service public APIs or method signatures
- No changes to route handlers or middleware
- No changes to error message strings
- No changes to repository interfaces
- No changes to existing service tests (they should continue passing unchanged)

## Capabilities

### New Capabilities
- `ownership-guard`: Generic ownership verification utility for multi-tenant entity access control

### Modified Capabilities
- `service-di`: Service DI spec's `verifyPatientOwnership` scenarios will reference the shared utility instead of private methods (delta spec required)

## Approach

Create `verifyOwnership<T>()` — a generic async function that accepts:
1. `fetchFn: () => Promise<T | null>` — entity fetcher (closure over repo.findById)
2. `entityId: string` — for error context
3. `userId: string` — owner to verify against
4. `ownerKey: keyof T` — property name holding the owner ID (default: `"userId"`)
5. `notFoundMessage: string` — error when entity is null
6. `forbiddenMessage: string` — error when owner doesn't match

Each service replaces its private method with a call to `verifyOwnership()`. For `PatientService` and `AppointmentService` which return the entity, the utility returns `T`. For `MedicalRecordService` and `AttachmentService` which only guard, the caller ignores the return value.

**Affected Areas**

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/ownership.ts` | New | Generic `verifyOwnership<T>()` utility |
| `src/lib/__tests__/ownership.test.ts` | New | Unit tests for the utility |
| `src/services/patient.service.ts` | Modified | Replace private `verifyPatientOwnership` with shared utility |
| `src/services/appointment.service.ts` | Modified | Replace private `verifyOwnership` with shared utility |
| `src/services/medical-record.service.ts` | Modified | Replace private `verifyPatientOwnership` with shared utility |
| `src/services/attachment.service.ts` | Modified | Replace private `verifyPatientOwnership` with shared utility |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidentally changing error messages | Low | Test assertions verify exact error strings |
| Breaking service tests due to import changes | Low | Services keep same public API; only private methods removed |
| `ownerKey` flexibility adds unneeded complexity | Low | Default to `"userId"`; all 4 services use it |

## Rollback Plan

Revert the 4 service files to their pre-change state (restore private methods). Delete `src/lib/ownership.ts` and its test file. No schema or data changes involved.

## Dependencies

- Existing `IPatientRepository` and `IAppointmentRepository` interfaces (unchanged)
- Existing error message conventions (preserved exactly)

## Success Criteria

- [ ] `verifyOwnership()` handles: not-found → throws with `notFoundMessage`
- [ ] `verifyOwnership()` handles: wrong owner → throws with `forbiddenMessage`
- [ ] `verifyOwnership()` returns entity on success
- [ ] All 4 services compile and pass existing tests without modification to test files
- [ ] No error message strings changed across the codebase
- [ ] Unit tests cover: null entity, mismatched userId, success path, custom ownerKey
