# Design: Consolidate Ownership Verification into Shared Guard

## Technical Approach

Extract the duplicated ownership-check pattern from four services into a single generic `verifyOwnership<T>()` utility in `src/lib/ownership.ts`. Each service replaces its private method with a call to this utility. No public APIs, route handlers, or error messages change.

## Architecture Decisions

### Decision: Generic utility with explicit error messages

**Choice**: `verifyOwnership(fetchFn, id, userId, notFoundMsg, forbiddenMsg)` — 5 parameters, caller provides error strings.

**Alternatives considered**:
- Single `entityName` param that constructs messages automatically → rejected: produces wrong grammar ("este cita" instead of "esta cita") and doesn't match existing messages exactly.
- `ownerKey` parameter for flexible property access → deferred: all 4 services use `userId`; adds complexity without current need. Can be added later if a non-`userId` owner property appears.

**Rationale**: Explicit messages preserve exact error string compatibility. Minimal parameter count (5) while remaining flexible for future entity types.

### Decision: Place in `src/lib/` not `src/services/`

**Choice**: `src/lib/ownership.ts`

**Alternatives considered**:
- `src/services/ownership-guard.ts` → rejected: it's a utility, not a service with DI or state.
- Inline in each service → rejected: defeats the DRY purpose.

**Rationale**: `src/lib/` is the established location for framework-independent utilities (`validations.ts`, `formatters.ts`, `encryption.ts`). This follows the existing convention.

### Decision: Return entity on success (not void)

**Choice**: Always return `T`. MedicalRecordService and AttachmentService callers discard the return value.

**Alternatives considered**:
- Overloaded return type (`Promise<T>` vs `Promise<void>`) → rejected: adds complexity, TypeScript infers correctly when return is ignored.

**Rationale**: Single signature is simpler. Callers that don't need the entity simply `await verifyOwnership(...)` without assigning.

## Data Flow

```
Service method (update/delete/getById)
  └─→ verifyOwnership(fetchFn, id, userId, notFoundMsg, forbiddenMsg)
        ├─→ fetchFn(id)  →  Entity | null
        │     └─→ repository.findById(id)
        ├─→ null?  →  throw Error(notFoundMsg)
        ├─→ entity.userId !== userId?  →  throw Error(forbiddenMsg)
        └─→ return entity
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ownership.ts` | Create | Generic `verifyOwnership<T>()` utility |
| `src/lib/__tests__/ownership.test.ts` | Create | Unit tests: not-found, wrong-owner, success path |
| `src/services/patient.service.ts` | Modify | Replace private `verifyPatientOwnership` with `verifyOwnership()` call |
| `src/services/appointment.service.ts` | Modify | Replace private `verifyOwnership` with shared utility call |
| `src/services/medical-record.service.ts` | Modify | Replace private `verifyPatientOwnership` with `verifyOwnership()` call |
| `src/services/attachment.service.ts` | Modify | Replace private `verifyPatientOwnership` with `verifyOwnership()` call |

## Interfaces / Contracts

```typescript
// src/lib/ownership.ts
export async function verifyOwnership<T>(
  fetchFn: (id: string) => Promise<T | null>,
  id: string,
  userId: string,
  notFoundMessage: string,
  forbiddenMessage: string
): Promise<T>
```

**Constraints on `T`**: None at the type level — `fetchFn` returns `T | null`, and the utility accesses `.userId` at runtime. A future enhancement could add `T extends { userId: string }` for compile-time safety if the owner property varies.

### Refactored service pattern

```typescript
// Before (PatientService)
private async verifyPatientOwnership(id: string, userId: string): Promise<Patient> {
  const patient = await this.patientRepo.findById(id);
  if (!patient) throw new Error("Paciente no encontrado");
  if (patient.userId !== userId) throw new Error("No tiene permiso para acceder a este paciente");
  return patient;
}

// After
private async verifyPatientOwnership(id: string, userId: string): Promise<Patient> {
  return verifyOwnership(
    this.patientRepo.findById.bind(this.patientRepo),
    id, userId,
    "Paciente no encontrado",
    "No tiene permiso para acceder a este paciente"
  );
}
```

Same pattern for all four services. The private method name and signature stay identical — only the body changes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `verifyOwnership()` — null entity throws `notFoundMessage` | Mock `fetchFn` returning `null`, assert error message |
| Unit | `verifyOwnership()` — wrong userId throws `forbiddenMessage` | Mock `fetchFn` returning entity with mismatched userId |
| Unit | `verifyOwnership()` — matching userId returns entity | Mock `fetchFn` returning entity, assert returned value |
| Unit | `verifyOwnership()` — custom error messages | Pass different message strings, verify exact match |
| Integration | Existing service tests pass unchanged | No test file modifications needed |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. No schema, data, or API changes. Services keep identical public interfaces and error behavior. Existing tests validate correctness without modification.

## Open Questions

- [ ] Should `verifyOwnership` constrain `T extends { userId: string }` for type safety? Current design relies on runtime access. Adding the constraint now is low-risk since all 4 entities use `userId`.
