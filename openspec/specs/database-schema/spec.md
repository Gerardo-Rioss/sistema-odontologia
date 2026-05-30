# Database Schema Specification

## Purpose

Defines the Prisma data models and migration strategy for the dental practice management system's PostgreSQL database. Establishes core entities — User, Patient, Appointment, Message, PasswordResetToken, and CalendarConnection — as the foundation for all future features.

## Requirements

### Requirement: Core Entity Models

The system SHALL define User, Patient, Appointment, Message, PasswordResetToken, and CalendarConnection models with explicit foreign-key relationships and enum-constrained fields.

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | `id` (PK), `email` (unique), `name`, `role` (ADMIN \| DENTIST), `emailVerified`? (DateTime), `createdAt` | has many Appointments, Patients, Messages (SentMessages + ReceivedMessages), PasswordResetTokens; has one CalendarConnection |
| Patient | `id` (PK), `name`, `email`, `phone`, `birthDate`, `notes`?, `userId` (FK), `createdAt`, `updatedAt` | belongs to User, has many Appointments |
| Appointment | `id` (PK), `date`, `time`, `type` (AppointmentType enum), `status` (AppointmentStatus enum), `notes`?, `userId` (FK), `patientId` (FK), `googleEventId`? (unique when non-null), `googleCalendarId`?, `createdAt`, `updatedAt` | belongs to User, belongs to Patient, has many Messages |
| Message | `id` (PK), `content`, `senderId` (FK), `receiverId` (FK), `appointmentId`? (FK), `readAt`?, `createdAt` | belongs to User (sender + receiver), optionally belongs to Appointment |
| PasswordResetToken | `id` (PK), `token` (unique), `userId` (FK), `expiresAt`, `createdAt` | belongs to User |
| CalendarConnection | `id` (PK), `userId` (FK, unique), `accessToken`, `refreshToken`, `tokenExpiry`, `googleEmail`, `googleCalendarId`, `status` (CalendarConnectionStatus), `channelId`?, `channelExpiry`?, `createdAt`, `updatedAt` | belongs to User |

Enums:
- Role: ADMIN, DENTIST
- AppointmentStatus: PENDING, CONFIRMED, CANCELLED, COMPLETED
- AppointmentType: LIMPIEZA, REVISION, URGENCIA, TRATAMIENTO, OTRO
- CalendarConnectionStatus: ACTIVE, REVOKED, EXPIRED

Constraints:
- `email` on User SHALL be unique
- `token` on PasswordResetToken SHALL be unique
- `userId` and `patientId` on Appointment SHALL enforce referential integrity
- `role` and `status` SHALL use Prisma enums, not free-text strings
- `time` on Appointment SHALL be HH:mm string
- `type` on Appointment SHALL be AppointmentType enum
- `userId` on Patient SHALL enforce referential integrity
- `notes` on Patient SHALL be optional text
- `updatedAt` on Patient SHALL auto-update on modification
- `userId` on CalendarConnection SHALL be unique (one connection per dentist)
- `googleEventId` on Appointment SHALL be unique when non-null
- `accessToken` and `refreshToken` on CalendarConnection SHALL be encrypted at rest
- PasswordResetToken.onDelete SHALL cascade on User deletion
- CalendarConnection.onDelete SHALL cascade on User deletion
- Message.senderId and Message.receiverId SHALL cascade on User deletion
- Message.appointmentId SHALL SetNull on Appointment deletion
- Appointment.onDelete SHALL cascade on Patient deletion
- `waMessageId` on WhatsAppMessage SHALL be unique
- `appointmentId` on WhatsAppMessage SHALL SetNull on Appointment deletion
- `phoneNumber` on ConversationState SHALL be indexed for fast lookup
- `whatsappReminderSent` on Appointment SHALL be nullable String (enum: null, 24h_sent, 2h_sent)

#### Scenario: User creation with defaults

- GIVEN an empty database
- WHEN a User record is created with `email` and `name`
- THEN it persists with auto-generated `id`, default `role=DENTIST`, `emailVerified=null`, and UTC `createdAt`

#### Scenario: Appointment links User and Patient

- GIVEN User(id=1) and Patient(id=1) exist
- WHEN an Appointment is created with `date`, `time`, `type`, `userId`, `patientId`
- THEN record persisted with referential integrity on both FKs, status defaults to PENDING

#### Scenario: Appointment with calendar sync fields

- GIVEN User(id=1) has CalendarConnection ACTIVE
- WHEN Appointment created and synced to Google
- THEN `googleEventId` and `googleCalendarId` populated from Google API response

#### Scenario: Appointment without calendar connection

- GIVEN User(id=1) has no CalendarConnection
- WHEN Appointment created
- THEN `googleEventId` and `googleCalendarId` remain null

#### Scenario: Cascade delete on patient removal

- GIVEN Patient(id=1) has existing Appointments
- WHEN Patient(id=1) is deleted
- THEN all related Appointments SHALL be cascade-deleted

### Requirement: CalendarConnection Model

The system SHALL define a CalendarConnection model for OAuth2 tokens and webhook state.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| userId | String | FK→User, unique, onDelete:Cascade |
| accessToken | String | Encrypted, required |
| refreshToken | String | Encrypted, required |
| tokenExpiry | DateTime | Required |
| googleEmail | String | Required |
| googleCalendarId | String | Required |
| status | CalendarConnectionStatus | Enum: ACTIVE, REVOKED, EXPIRED |
| channelId | String? | Active webhook channel ID |
| channelExpiry | DateTime? | Webhook channel expiration |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

`userId` SHALL be unique — one connection per dentist. `accessToken` and `refreshToken` SHALL be encrypted at rest.

#### Scenario: One connection per user

- GIVEN User(id=1) has ACTIVE CalendarConnection
- WHEN second CalendarConnection created for same user
- THEN unique constraint violation on `userId`

#### Scenario: Cascade delete on user removal

- GIVEN User(id=1) with CalendarConnection
- WHEN User(id=1) deleted
- THEN CalendarConnection cascade-deleted

### Requirement: Message Model

The system SHALL define a Message model for dentist-to-dentist messaging.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| content | String | Required |
| senderId | String | FK→User, onDelete:Cascade |
| receiverId | String | FK→User, onDelete:Cascade |
| appointmentId | String? | FK→Appointment, onDelete:SetNull |
| readAt | DateTime? | Optional, null when unread |
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

### Requirement: Schema Migrations

The system MUST use Prisma Migrate for version-controlled, reproducible schema changes.

#### Scenario: Initial migration generation

- GIVEN `schema.prisma` defines the core models
- WHEN `prisma migrate dev --name init` is executed
- THEN a migration file is generated under `prisma/migrations/` AND applied to the connected database

#### Scenario: Schema validation in CI

- GIVEN schema changes are pushed to the repository
- WHEN CI executes `npx prisma generate`
- THEN the Prisma client generation SHALL succeed, confirming schema validity

### Requirement: WhatsAppMessage Model

The system SHALL define a WhatsAppMessage model for persisting WhatsApp communication.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| waMessageId | String | Unique, WhatsApp API message ID |
| phoneNumber | String | Required, patient WhatsApp number |
| body | String | Required, message text content |
| direction | Enum | INBOUND, OUTBOUND |
| messageType | Enum | TEXT, TEMPLATE, INTERACTIVE |
| templateName | String? | Template name if template message |
| userId | String? | FK→User, onDelete:Cascade |
| appointmentId | String? | FK→Appointment, onDelete:SetNull |
| createdAt | DateTime | @default(now()) |

Enum: `MessageDirection` = INBOUND | OUTBOUND. `MessageTypeEnum` = TEXT | TEMPLATE | INTERACTIVE.
`waMessageId` SHALL be unique. `appointmentId.onDelete` SHALL SetNull.

#### Scenario: Inbound message persisted
- GIVEN webhook receives "hola" from +549...
- WHEN WhatsAppMessage created with direction=INBOUND, waMessageId="wamid.abc"
- THEN record persisted; appointmentId null when no appointment reference

#### Scenario: Outbound template persisted
- GIVEN confirmation template sent, API returns waMessageId="wamid.xyz"
- WHEN WhatsAppMessage created with direction=OUTBOUND, templateName="appointment_confirmation"
- THEN record persisted with both waMessageId and templateName

### Requirement: ConversationState Model

The system SHALL define a ConversationState model to persist per-patient conversation state machine.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| phoneNumber | String | Required, indexed |
| currentState | Enum | IDLE, GREETING, SERVICE_SELECTION, DATE_SELECTION, TIME_SELECTION, CONFIRMATION, COMPLETED |
| context | Json | {selectedService, selectedDate, selectedTime, appointmentId, awaitingCancellation} |
| expiresAt | DateTime? | State TTL (5 min), auto-cleared |
| updatedAt | DateTime | @updatedAt |
| createdAt | DateTime | @default(now()) |

Enum: `ConversationStateEnum`. `phoneNumber` SHALL be indexed for fast lookup on every inbound message. `context` default SHALL be `{}`.

#### Scenario: New conversation initialized
- GIVEN patient "+549..." has no existing ConversationState
- WHEN first inbound message received
- THEN record created with currentState=GREETING, context={}

#### Scenario: State transitions persist
- GIVEN state=DATE_SELECTION, context={selectedService:"LIMPIEZA"}
- WHEN patient selects date "2026-06-15"
- THEN currentState→TIME_SELECTION, context.selectedDate="2026-06-15"

### Requirement: Appointment WhatsApp Reminder Tracking

The Appointment model SHALL gain optional field `whatsappReminderSent` (String?, enum: `null` | `24h_sent` | `2h_sent`).

All existing Appointment fields and constraints REMAIN UNCHANGED.

#### Scenario: Reminder flag progression
- GIVEN appointment with whatsappReminderSent=null
- WHEN 24h reminder sent → THEN flag=24h_sent
- WHEN 2h reminder sent → THEN flag=2h_sent

#### Scenario: New appointment defaults to null
- GIVEN new Appointment created via any flow
- THEN whatsappReminderSent defaults to null
