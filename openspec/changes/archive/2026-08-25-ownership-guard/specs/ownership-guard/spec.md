# Ownership Guard Specification

## Purpose

Provide a generic, reusable ownership verification utility that prevents unauthorized access to tenant-scoped entities. Replaces duplicated ownership logic across 4 service classes with a single, testable function.

## Requirements

### Requirement: verifyOwnership Generic Function

The system SHALL provide a generic function `verifyOwnership<T>(fetchFn, id, userId, entityName)` that verifies entity existence and ownership in a single call.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fetchFn` | `(id: string) => Promise<T \| null>` | Fetches the entity by ID |
| `id` | `string` | Entity identifier |
| `userId` | `string` | Expected owner identifier |
| `entityName` | `string` | Human-readable entity name for error messages |

#### Scenario: Entity found and owned returns entity

- GIVEN `fetchFn("p1")` resolves to `{ id: "p1", userId: "d1", name: "Ana" }`
- WHEN `verifyOwnership(fetchFn, "p1", "d1", "Patient")` is called
- THEN the function resolves to `{ id: "p1", userId: "d1", name: "Ana" }`

#### Scenario: Entity not found throws not found error

- GIVEN `fetchFn("p1")` resolves to `null`
- WHEN `verifyOwnership(fetchFn, "p1", "d1", "Patient")` is called
- THEN the function rejects with `"No encontrado"`
- AND the rejection is an `Error` instance

#### Scenario: Entity found but wrong owner throws forbidden error

- GIVEN `fetchFn("p1")` resolves to `{ id: "p1", userId: "d2", name: "Ana" }`
- WHEN `verifyOwnership(fetchFn, "p1", "d1", "Patient")` is called
- THEN the function rejects with `"No tiene permiso"`
- AND the rejection is an `Error` instance

#### Scenario: Works with Patient type

- GIVEN `fetchFn` returns a `Patient` object with `userId` field
- WHEN `verifyOwnership(fetchFn, id, userId, "Patient")` is called
- THEN the return type is inferred as `Patient`

#### Scenario: Works with Appointment type

- GIVEN `fetchFn` returns an `Appointment` object with `userId` field
- WHEN `verifyOwnership(fetchFn, id, userId, "Appointment")` is called
- THEN the return type is inferred as `Appointment`

#### Scenario: Works with any type having userId field

- GIVEN `fetchFn` returns `{ id: "x1", userId: "d1", customField: 42 }`
- WHEN `verifyOwnership(fetchFn, "x1", "d1", "CustomEntity")` is called
- THEN the function resolves to the full entity object
- AND the return type preserves all entity fields

### Requirement: Ownership Guard Error Messages

The system SHALL throw exactly `"No encontrado"` when the entity does not exist, and exactly `"No tiene permiso"` when the caller does not own the entity. Error messages MUST NOT vary by entity type or context.

#### Scenario: Error messages are string literals

- GIVEN a `fetchFn` that returns `null`
- WHEN `verifyOwnership(fetchFn, "x1", "d1", "AnyEntity")` rejects
- THEN the rejection message is exactly `"No encontrado"`

#### Scenario: Forbidden message is string literal

- GIVEN a `fetchFn` that returns an entity with `userId !== userId`
- WHEN `verifyOwnership(fetchFn, "x1", "d1", "AnyEntity")` rejects
- THEN the rejection message is exactly `"No tiene permiso"`

### Requirement: Ownership Guard Abstraction Location

The `verifyOwnership` function SHALL be exported from `src/lib/ownership.ts` as a named export. The module SHALL have no dependencies beyond TypeScript built-ins.

#### Scenario: Module exports verifyOwnership

- GIVEN the module `src/lib/ownership.ts`
- WHEN the module is imported
- THEN `verifyOwnership` is a named export
- AND the function signature is `verifyOwnership<T>(fetchFn: (id: string) => Promise<T | null>, id: string, userId: string, entityName: string): Promise<T>`
