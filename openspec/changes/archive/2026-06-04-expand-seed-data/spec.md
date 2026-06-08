# Delta Spec: expand-seed-data

## Overview

Expand `prisma/seed.ts` to populate all 8 models with deterministic test data covering every enum variant, enabling end-to-end verification without manual data entry.

---

## ADDED Requirements

### Requirement: Seed ALL 8 models

The seed MUST create records for every model in the schema: `User`, `Patient`, `Appointment`, `Message`, `WhatsAppMessage`, `ConversationState`, `CalendarConnection`, `PasswordResetToken`.

#### Scenario: db:seed creates all records

- GIVEN a fresh database with schema applied
- WHEN `npx prisma db seed` runs
- THEN records exist for all 8 models
- AND no error is thrown

---

### Requirement: Cover all AppointmentStatus values

The seed MUST create at least one `Appointment` for each `AppointmentStatus`: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.

#### Scenario: All statuses present

- GIVEN the seed has run
- WHEN we query `Appointment` grouped by status
- THEN each status appears at least once

---

### Requirement: Cover all AppointmentType values

The seed MUST create at least one `Appointment` for each `AppointmentType`: `LIMPIEZA`, `REVISION`, `URGENCIA`, `TRATAMIENTO`, `OTRO`.

#### Scenario: All types present

- GIVEN the seed has run
- WHEN we query `Appointment` grouped by type
- THEN each type appears at least once

---

### Requirement: Date range diversity

The seed MUST include appointments with past, present, and future dates to support date-range filtering tests.

#### Scenario: Mix of dates exists

- GIVEN the seed has run
- WHEN we query `Appointment` dates
- THEN at least one appointment has `date < today`
- AND at least one has `date = today`
- AND at least one has `date > today`

---

### Requirement: Appointments linked to both user roles

The seed MUST create appointments assigned to both the seeded admin user and the seeded dentist user.

#### Scenario: Cross-user appointments

- GIVEN the seed has run
- WHEN we query `Appointment` with user relation
- THEN appointments exist linked to admin
- AND appointments exist linked to dentist

---

### Requirement: Message records between users

The seed MUST create 3–5 `Message` records covering both directions between the seeded admin and dentist users.

#### Scenario: Bidirectional messages exist

- GIVEN the seed has run
- WHEN we query `Message`
- THEN at least one message has `senderId = admin` and `receiverId = dentist`
- AND at least one has `senderId = dentist` and `receiverId = admin`

#### Scenario: Unread message exists

- GIVEN the seed has run
- WHEN we query `Message` where `readAt IS NULL`
- THEN at least one record is returned

---

### Requirement: WhatsAppMessage records with varied statuses

The seed MUST create 2–3 `WhatsAppMessage` records linked to existing patients, covering `SENT`, `DELIVERED`, and `READ` statuses.

#### Scenario: WhatsApp statuses covered

- GIVEN the seed has run
- WHEN we query `WhatsAppMessage`
- THEN each status (`SENT`, `DELIVERED`, `READ`) appears at least once

---

### Requirement: ConversationState records with state machine transitions

The seed MUST create `ConversationState` records for 2–3 patients covering states: `INITIAL`, `WAITING_APPOINTMENT`, `APPOINTMENT_CONFIRMED`, and at least one additional state transition per patient.

#### Scenario: Multiple states per patient

- GIVEN the seed has run
- WHEN we query `ConversationState` for a seeded patient
- THEN that patient has at least 2 state records
- AND transitions are chronologically consistent

---

### Requirement: Active CalendarConnection for OAuth testing

The seed MUST create exactly 1 `CalendarConnection` with `status = ACTIVE`, valid mock tokens, and a `calendarId` referencing an existing user.

#### Scenario: Active connection exists

- GIVEN the seed has run
- WHEN we query `CalendarConnection` where `status = ACTIVE`
- THEN exactly 1 record is returned
- AND it has non-null `accessToken`, `refreshToken`, and `calendarId`

---

### Requirement: PasswordResetToken for expiry testing

The seed MUST create 2 `PasswordResetToken` records: one expired and one valid, both linked to an existing user.

#### Scenario: Token lifecycle covered

- GIVEN the seed has run
- WHEN we query `PasswordResetToken`
- THEN exactly 1 record has `expiresAt < now`
- AND exactly 1 record has `expiresAt > now`

---

### Requirement: Clean-slate cleanup before insert

The seed MUST use `deleteMany` for each new model before insert to ensure deterministic runs.

#### Scenario: Re-run produces same data

- GIVEN seed has run once
- WHEN seed runs a second time
- THEN no duplicate records exist
- AND record counts match the first run

---

## Test Scenarios

| Scenario | What to verify |
|----------|---------------|
| Dashboard shows all appointment statuses | Count by status in seed matches UI count |
| WhatsApp webhook receives message | WhatsAppMessage table has records |
| Chatbot transitions between states | ConversationState has multiple states per patient |
| Calendar sync works | CalendarConnection is ACTIVE with valid tokens |
| Password reset flow | Valid token allows password change; expired token rejects |

---

## Success Criteria

- [x] `db:seed` creates data for ALL 8 models (User, Patient, Appointment, Message, WhatsAppMessage, ConversationState, CalendarConnection, PasswordResetToken)
- [x] All `AppointmentStatus` enum values appear (PENDING×4, CONFIRMED×2, CANCELLED×1, COMPLETED×1)
- [x] All `AppointmentType` enum values appear (LIMPIEZA×2, REVISION×2, URGENCIA×2, TRATAMIENTO×2, OTRO×1)
- [x] `npx prisma db seed` runs without errors (TypeScript compilation passes)
- [x] Existing tests still pass after seed expansion

---

## Out of Scope

- Schema changes (all models already exist in `prisma/schema.prisma`)
- Migration files
- Production data (dev-only)
- Seed file refactoring (expand in place only)
