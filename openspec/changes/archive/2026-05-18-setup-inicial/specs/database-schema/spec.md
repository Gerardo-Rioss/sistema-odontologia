# Database Schema Specification

## Purpose

Defines the initial Prisma data models and migration strategy for the dental practice management system's PostgreSQL database. Establishes core entities as the foundation for all future features.

## Requirements

### Requirement: Core Entity Models

The system SHALL define three Prisma models with explicit foreign-key relationships and enum-constrained fields.

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | `id` (PK), `email` (unique), `name`, `role` (ADMIN \| DENTIST), `createdAt` | has many Appointments |
| Patient | `id` (PK), `name`, `email`, `phone`, `birthDate`, `createdAt` | has many Appointments |
| Appointment | `id` (PK), `date`, `status` (SCHEDULED \| COMPLETED \| CANCELLED), `notes`?, `userId` (FK), `patientId` (FK), `createdAt` | belongs to User, belongs to Patient |

Constraints:
- `email` on User SHALL be unique
- `userId` and `patientId` on Appointment SHALL enforce referential integrity
- `role` and `status` SHALL use Prisma enums, not free-text strings

#### Scenario: User creation with defaults

- GIVEN an empty database
- WHEN a User record is created with `email` and `name`
- THEN it persists with auto-generated `id`, default `role=DENTIST`, and UTC `createdAt`

#### Scenario: Appointment links User and Patient

- GIVEN User(id=1) and Patient(id=1) exist
- WHEN an Appointment is created referencing both
- THEN the record persists AND referential integrity is enforced on both foreign keys

#### Scenario: Cascade delete on patient removal

- GIVEN Patient(id=1) has existing Appointments
- WHEN Patient(id=1) is deleted
- THEN all related Appointments SHALL be cascade-deleted

### Requirement: Schema Migrations

The system MUST use Prisma Migrate for version-controlled, reproducible schema changes.

#### Scenario: Initial migration generation

- GIVEN `schema.prisma` defines the three core models
- WHEN `prisma migrate dev --name init` is executed
- THEN a migration file is generated under `prisma/migrations/` AND applied to the connected database

#### Scenario: Schema validation in CI

- GIVEN schema changes are pushed to the repository
- WHEN CI executes `npx prisma generate`
- THEN the Prisma client generation SHALL succeed, confirming schema validity
