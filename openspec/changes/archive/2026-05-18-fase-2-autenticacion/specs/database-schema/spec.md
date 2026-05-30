# Delta for database-schema

## ADDED Requirements

### Requirement: PasswordResetToken Model

The system SHALL define a PasswordResetToken model with `token` (unique, String), `userId` (FK → User), `expiresAt` (DateTime), and cascade-delete on User removal.

#### Scenario: Token linked to user

- GIVEN User(id=1) exists
- WHEN PasswordResetToken created with userId=1
- THEN record persisted, referential integrity enforced on userId

#### Scenario: Token uniqueness

- GIVEN token "abc-123" already exists
- WHEN second record with same token is created
- THEN unique constraint violation raised

#### Scenario: Cascade delete on user removal

- GIVEN User(id=1) has associated PasswordResetToken records
- WHEN User(id=1) is deleted
- THEN all associated tokens SHALL be cascade-deleted

## MODIFIED Requirements

### Requirement: Core Entity Models

The system SHALL define User, Patient, Appointment, and PasswordResetToken models with explicit foreign-key relationships and enum-constrained fields.
(Previously: system defined three models — User lacked emailVerified field and PasswordResetToken did not exist)

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | `id` (PK), `email` (unique), `name`, `role` (ADMIN \| DENTIST), `emailVerified`? (DateTime), `createdAt` | has many Appointments, has many PasswordResetTokens |
| Patient | `id` (PK), `name`, `email`, `phone`, `birthDate`, `createdAt` | has many Appointments |
| Appointment | `id` (PK), `date`, `status` (SCHEDULED \| COMPLETED \| CANCELLED), `notes`?, `userId` (FK), `patientId` (FK), `createdAt` | belongs to User, belongs to Patient |
| PasswordResetToken | `id` (PK), `token` (unique), `userId` (FK), `expiresAt`, `createdAt` | belongs to User |

Constraints:
- `email` on User SHALL be unique
- `token` on PasswordResetToken SHALL be unique
- `userId` and `patientId` on Appointment SHALL enforce referential integrity
- `role` and `status` SHALL use Prisma enums, not free-text strings
- PasswordResetToken.onDelete SHALL cascade on User deletion

#### Scenario: User creation with defaults

- GIVEN an empty database
- WHEN a User record is created with `email` and `name`
- THEN it persists with auto-generated `id`, default `role=DENTIST`, `emailVerified=null`, and UTC `createdAt`

#### Scenario: Appointment links User and Patient

- GIVEN User(id=1) and Patient(id=1) exist
- WHEN an Appointment is created referencing both
- THEN the record persists AND referential integrity is enforced on both foreign keys

#### Scenario: Cascade delete on patient removal

- GIVEN Patient(id=1) has existing Appointments
- WHEN Patient(id=1) is deleted
- THEN all related Appointments SHALL be cascade-deleted
