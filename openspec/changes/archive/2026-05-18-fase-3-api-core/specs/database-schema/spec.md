# Delta for Database Schema

## ADDED Requirements

### Requirement: Message Model
The system SHALL define a Message model for dentist-to-dentist messaging.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| content | String | Required |
| senderId | String | FK→User, onDelete:Cascade |
| receiverId | String | FK→User, onDelete:Cascade |
| appointmentId | String? | FK→Appointment, onDelete:SetNull |
| createdAt | DateTime | @default(now()) |

`sender` uses named relation "SentMessages", `receiver` uses "ReceivedMessages". `appointment` is optional relation to Appointment.

#### Scenario: Message with appointment reference
- GIVEN User(1), User(2), Appointment(1) exist
- WHEN Message created with senderId=1, receiverId=2, appointmentId=1
- THEN record persisted with all FK integrity enforced

#### Scenario: Cascade on sender deletion
- GIVEN User(1) sent messages to User(2)
- WHEN User(1) deleted
- THEN all messages where senderId=1 SHALL cascade-delete

## MODIFIED Requirements

### Requirement: Core Entity Models
The system SHALL define User, Patient, Appointment, Message, and PasswordResetToken models. (Previously: User, Patient, Appointment, PasswordResetToken only.)

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | `id`(PK), `email`(unique), `name`, `role`(ADMIN\|DENTIST), `emailVerified`?, `createdAt` | has many Appointments, Patients, Messages(sent+received), PasswordResetTokens |
| Patient | `id`(PK), `name`, `email`, `phone`, `birthDate`, `notes`?, `userId`(FK), `createdAt`, `updatedAt` | belongs to User, has many Appointments |
| Appointment | `id`(PK), `date`, `time`, `type`(enum), `status`(enum), `notes`?, `userId`(FK), `patientId`(FK), `createdAt` | belongs to User, belongs to Patient |
| PasswordResetToken | `id`(PK), `token`(unique), `userId`(FK), `expiresAt`, `createdAt` | belongs to User |

Enums:
- AppointmentStatus: PENDING, CONFIRMED, CANCELLED, COMPLETED (Previously: SCHEDULED, COMPLETED, CANCELLED)
- AppointmentType: LIMPIEZA, REVISION, URGENCIA, TRATAMIENTO, OTRO (NEW)

Constraints (additions in **bold**):
- `email` on User SHALL be unique
- `token` on PasswordResetToken SHALL be unique
- `userId` and `patientId` on Appointment SHALL enforce referential integrity
- **`time`** on Appointment SHALL be HH:mm string
- **`type`** on Appointment SHALL be AppointmentType enum
- **`userId` on Patient** SHALL enforce referential integrity (Previously: Patient had no userId)
- **`notes` on Patient** SHALL be optional text
- **`updatedAt` on Patient** SHALL auto-update on modification
- PasswordResetToken.onDelete SHALL cascade on User deletion

#### Scenario: User creation with defaults
- GIVEN empty database
- WHEN User created with `email` and `name`
- THEN persists with auto-generated `id`, default `role=DENTIST`, `emailVerified=null`, UTC `createdAt`

#### Scenario: Appointment links User and Patient
- GIVEN User(1) and Patient(1) exist
- WHEN Appointment created with `date`, `time`, `type`, `userId`, `patientId`
- THEN record persisted with referential integrity on both FKs, status defaults to PENDING

#### Scenario: Cascade delete on patient removal
- GIVEN Patient(1) has existing Appointments
- WHEN Patient(1) is deleted
- THEN all related Appointments SHALL be cascade-deleted
