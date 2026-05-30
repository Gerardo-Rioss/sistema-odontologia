# Delta for Database Schema

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Core Entity Models

The system SHALL define User, Patient, Appointment, Message, PasswordResetToken, and CalendarConnection models with explicit foreign-key relationships and enum-constrained fields.

(Previously: Appointment lacked `googleEventId` and `googleCalendarId`; CalendarConnection model did not exist.)

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | `id` (PK), `email` (unique), `name`, `role` (ADMIN \| DENTIST), `emailVerified`? (DateTime), `createdAt` | has many Appointments, Patients, Messages, PasswordResetTokens; has one CalendarConnection |
| Patient | `id` (PK), `name`, `email`, `phone`, `birthDate`, `notes`?, `userId` (FK), `createdAt`, `updatedAt` | belongs to User, has many Appointments |
| Appointment | `id` (PK), `date`, `time`, `type` (AppointmentType), `status` (AppointmentStatus), `notes`?, `userId` (FK), `patientId` (FK), `googleEventId`? (unique), `googleCalendarId`?, `createdAt`, `updatedAt` | belongs to User, belongs to Patient, has many Messages |
| Message | `id` (PK), `content`, `senderId` (FK), `receiverId` (FK), `appointmentId`? (FK), `readAt`?, `createdAt` | belongs to User (sender + receiver), optionally belongs to Appointment |
| PasswordResetToken | `id` (PK), `token` (unique), `userId` (FK), `expiresAt`, `createdAt` | belongs to User |
| CalendarConnection | `id` (PK), `userId` (FK, unique), `accessToken`, `refreshToken`, `tokenExpiry`, `googleEmail`, `googleCalendarId`, `status` (CalendarConnectionStatus), `channelId`?, `channelExpiry`?, `createdAt`, `updatedAt` | belongs to User |

All existing enums and constraints remain. New constraints:
- `googleEventId` on Appointment SHALL be unique when non-null
- `accessToken` and `refreshToken` on CalendarConnection SHALL be encrypted at rest

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
