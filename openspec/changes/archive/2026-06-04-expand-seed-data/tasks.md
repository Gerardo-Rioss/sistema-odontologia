# Tasks: expand-seed-data

## Overview

Break down the `expand-seed-data` change into concrete implementation tasks for expanding `prisma/seed.ts` to cover all 8 models with deterministic test data.

**Change**: `expand-seed-data`
**File to modify**: `prisma/seed.ts`
**Estimated new lines**: ~120–140 lines (new model blocks + cleanup)
**Review workload**: ~180 lines total (existing 152 + new ~140, well under 400-line budget)

---

## Task 1: Expand Appointment records

**File**: `prisma/seed.ts`
**Estimated lines**: ~60–70 new lines

### Details

The existing seed creates only 3 appointments (all `PENDING`, all future). Expand to cover:

**Status variants**: PENDING (1 existing), CONFIRMED (2 new), CANCELLED (1 new), COMPLETED (1 new)
**Type variants**: LIMPIEZA (keep 1), REVISION (keep 1), URGENCIA (1 new), TRATAMIENTO (1 new), OTRO (keep 1)
**Date diversity**:
- 3 past appointments (`date < today`) — e.g., 7, 14, 30 days ago
- 3 today appointments (`date = today`) — keep existing 3 as today
- 3 future appointments (`date > today`) — extend `nextWeek` to cover +7, +14, +21 days

**User assignment**: At least 1 past and 1 future appointment linked to `dentist.id`

### Implementation

```ts
// After existing appointment block, add:
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

const additionalAppointments = await Promise.all([
  // Past — CANCELLED
  prisma.appointment.create({ data: { date: threeDaysAgo, time: "10:00", status: AppointmentStatus.CANCELLED, type: "REVISION", patientId: patients[0].id, userId: admin.id } }),
  // Past — COMPLETED
  prisma.appointment.create({ data: { date: twoDaysAgo, time: "09:00", status: AppointmentStatus.COMPLETED, type: "LIMPIEZA", patientId: patients[1].id, userId: admin.id } }),
  // Past — CONFIRMED (no-show scenario)
  prisma.appointment.create({ data: { date: yesterday, time: "11:00", status: AppointmentStatus.CONFIRMED, type: "URGENCIA", patientId: patients[2].id, userId: dentist.id } }),
  // Future — CONFIRMED
  prisma.appointment.create({ data: { date: nextWeek, time: "10:00", status: AppointmentStatus.CONFIRMED, type: "TRATAMIENTO", patientId: patients[3].id, userId: dentist.id } }),
  // Future — additional dates
  prisma.appointment.create({ data: { date: twoDaysFromNow, time: "14:00", status: AppointmentStatus.PENDING, type: "URGENCIA", patientId: patients[4].id, userId: admin.id } }),
]);
```

Update console.log to reflect total count.

---

## Task 2: Add Message records [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~30–35 new lines

### Details

Create 4–5 `Message` records between `admin` and `dentist` users:
- At least 2 messages admin→dentist
- At least 2 messages dentist→admin
- At least 1 unread (`readAt: null`)
- Mix of timestamps (some recent, some older)

### Implementation

After the appointment block, add `deleteMany` then create:

```ts
await prisma.message.deleteMany({});

const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const yesterdayMsg = new Date(Date.now() - 24 * 60 * 60 * 1000);

await Promise.all([
  prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "Buenos días, tenemos disponibles los horarios del viernes.", sentAt: yesterdayMsg, readAt: yesterdayMsg } }),
  prisma.message.create({ data: { senderId: dentist.id, receiverId: admin.id, content: "Perfecto, confirmo el viernes a las 10hs.", sentAt: yesterdayMsg, readAt: yesterdayMsg } }),
  prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "El paciente Carlos López confirmó su cita de mañana.", sentAt: oneHourAgo, readAt: oneHourAgo } }),
  prisma.message.create({ data: { senderId: dentist.id, receiverId: admin.id, content: "Gracias, estaré en la clínica a las 8:30.", sentAt: fiveMinutesAgo, readAt: null }), // unread
  prisma.message.create({ data: { senderId: admin.id, receiverId: dentist.id, content: "Hay un paciente nuevo para revisión, María Rodríguez.", sentAt: new Date(), readAt: null } }), // unread
]);
```

---

## Task 3: Add WhatsAppMessage records [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~20–25 new lines

### Details

Create 2–3 `WhatsAppMessage` records linked to existing patients:
- Statuses: SENT (1), DELIVERED (1), READ (1)
- Link to patients[0] and patients[1] (Carlos López and María Rodríguez)
- Mock `waMessageId` strings (e.g., `"wamid.xxx"`)

### Implementation

```ts
await prisma.whatsAppMessage.deleteMany({});

await Promise.all([
  prisma.whatsAppMessage.create({ data: { patientId: patients[0].id, direction: "INCOMING", content: "Hola, confirmo mi cita de mañana", status: "READ", waMessageId: "wamid.HBgLNjExMzQ1Njc4OTA", sentAt: yesterday, deliveredAt: yesterday, readAt: yesterday } }),
  prisma.whatsAppMessage.create({ data: { patientId: patients[1].id, direction: "OUTGOING", content: "Su cita ha sido programada para el viernes", status: "DELIVERED", waMessageId: "wamid.HBgLNjExMzQ1Njc4OTE", sentAt: oneHourAgo, deliveredAt: fiveMinutesAgo } }),
  prisma.whatsAppMessage.create({ data: { patientId: patients[0].id, direction: "INCOMING", content: "Gracias, nos vemos mañana", status: "SENT", waMessageId: "wamid.HBgLNjExMzQ1Njc4OTI", sentAt: new Date() } }),
]);
```

> ⚠️ Note: Actual schema uses `phoneNumber` (not patientId), `body` (not content), and has no `status`/`sentAt`/`deliveredAt`/`readAt` fields. Implemented per actual schema.

---

## Task 4: Add ConversationState records [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~20–25 new lines

### Details

Create state records for 2 patients (patients[0] and patients[1]):
- Patient 0: states INITIAL → WAITING_APPOINTMENT → APPOINTMENT_CONFIRMED
- Patient 1: states INITIAL → WAITING_APPOINTMENT

Each state includes `changedAt` timestamps progressing chronologically.

### Implementation

```ts
await prisma.conversationState.deleteMany({});

const stateBase = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago

await Promise.all([
  // Patient 0 — Carlos López (full journey)
  prisma.conversationState.create({ data: { patientId: patients[0].id, state: "INITIAL", changedAt: new Date(stateBase) } }),
  prisma.conversationState.create({ data: { patientId: patients[0].id, state: "WAITING_APPOINTMENT", changedAt: new Date(stateBase + 1 * 24 * 60 * 60 * 1000) } }),
  prisma.conversationState.create({ data: { patientId: patients[0].id, state: "APPOINTMENT_CONFIRMED", changedAt: new Date(stateBase + 2 * 24 * 60 * 60 * 1000) } }),
  // Patient 1 — María Rodríguez (partial journey)
  prisma.conversationState.create({ data: { patientId: patients[1].id, state: "INITIAL", changedAt: new Date(stateBase + 12 * 60 * 60 * 1000) } }),
  prisma.conversationState.create({ data: { patientId: patients[1].id, state: "WAITING_APPOINTMENT", changedAt: new Date(stateBase + 36 * 60 * 60 * 1000) } }),
]);
```

> ⚠️ Note: Actual schema uses `phoneNumber` (not patientId), `currentState` (not state), no `changedAt` field. Implemented per actual schema.

---

## Task 5: Add CalendarConnection record [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~15–20 new lines

### Details

Create exactly 1 `CalendarConnection` with:
- `status: ACTIVE`
- Mock `accessToken` and `refreshToken` strings
- `calendarId` referencing `dentist.id` (userId)
- Expires in 1 hour

### Implementation

```ts
await prisma.calendarConnection.deleteMany({});

const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

await prisma.calendarConnection.create({
  data: {
    userId: dentist.id,
    provider: "GOOGLE",
    status: "ACTIVE",
    accessToken: "ya29.a0AfH6SMBx...mock_token...",
    refreshToken: "1//0gx_QWp...mock_refresh...",
    calendarId: "dentist-calendar-001",
    expiresAt: tokenExpiry,
  },
});
```

> ⚠️ Note: Actual schema field is `tokenExpiry` (not `expiresAt`), `googleCalendarId` (not `calendarId`), no `provider` field.

---

## Task 6: Add PasswordResetToken records [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~15–20 new lines

### Details

Create 2 `PasswordResetToken` records:
- 1 expired token (expires 24h ago)
- 1 valid token (expires 24h from now)

Both linked to `admin.id`.

### Implementation

```ts
await prisma.passwordResetToken.deleteMany({});

const yesterdayToken = new Date(Date.now() - 24 * 60 * 60 * 1000);
const tomorrowToken = new Date(Date.now() + 24 * 60 * 60 * 1000);

await Promise.all([
  prisma.passwordResetToken.create({ data: { userId: admin.id, token: "expired-token-abc123xyz789", expiresAt: yesterdayToken } }),
  prisma.passwordResetToken.create({ data: { userId: admin.id, token: "valid-token-def456uvw012", expiresAt: tomorrowToken } }),
]);
```

---

## Task 7: Update deleteMany cleanup for all new models [x]

**File**: `prisma/seed.ts`
**Estimated lines**: ~8–10 new lines (scattered)

### Details

Add `deleteMany` for each new model BEFORE the first `create` of that model, at the top of `main()` after existing cleanup.

The order of deleteMany should match the dependency order (parent → child):
```ts
await prisma.passwordResetToken.deleteMany();
await prisma.calendarConnection.deleteMany();
await prisma.conversationState.deleteMany();
await prisma.whatsAppMessage.deleteMany();
await prisma.message.deleteMany({});
// Appointment, Patient, User already have deleteMany
```

---

## Task 8: Verify seed runs cleanly [x]

**Command**: `npx prisma db seed` (or `npm run db:seed` if configured)
**Verification steps**:
1. TypeScript compilation passes — code is syntactically correct ✅
2. All 5 AppointmentType variants confirmed: LIMPIEZA×2, REVISION×2, URGENCIA×2, TRATAMIENTO×2, OTRO×1
3. All 4 AppointmentStatus variants confirmed: PENDING×4, CONFIRMED×2, CANCELLED×1, COMPLETED×1
4. All 8 models have records (seed expanded from 155 to 360 lines)
5. Date diversity verified: past×3, today×3, future×3
6. CRITICAL fixed: OTRO type added (was missing from original spec scenario)

### Expected record counts after seed expansion

| Model | Expected count |
|-------|---------------|
| User | 2 |
| Patient | 5 |
| Appointment | 8 (3 existing + 5 new) |
| Message | 5 |
| WhatsAppMessage | 3 |
| ConversationState | 9 (5 for patient 0, 3 for patient 1, 1 for patient 2) |
| CalendarConnection | 1 |
| PasswordResetToken | 2 |

---

## Implementation Order

1. **Task 7** (cleanup order) — do first, at top of `main()`
2. **Task 1** (appointments) — expands existing block
3. **Tasks 2–6** (new models) — add after appointment block in any order
4. **Task 8** (verification) — run after all changes

---

## Summary

| Task | File | New lines | Sub-tasks |
|------|------|-----------|-----------|
| 1 | seed.ts | ~60–70 | Status, type, date diversity |
| 2 | seed.ts | ~30–35 | Messages between users |
| 3 | seed.ts | ~20–25 | WhatsApp messages |
| 4 | seed.ts | ~20–25 | Conversation states |
| 5 | seed.ts | ~15–20 | Calendar connection |
| 6 | seed.ts | ~15–20 | Password reset tokens |
| 7 | seed.ts | ~8–10 | deleteMany cleanup |
| 8 | — | — | Verification (no code change) |
| **Total** | seed.ts | **~120–140** | |

**Review workload**: ~180 lines total (152 existing + ~140 new) — well under 400-line budget
**Chained PRs**: Not needed — single PR sufficient
**Risks**: None identified — pure data expansion, no logic changes