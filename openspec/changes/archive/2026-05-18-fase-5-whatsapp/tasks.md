# Tasks: Integración WhatsApp — Bot Conversacional

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + Types + Config | PR 1 | Foundation only — no runtime. Deps, env vars, Prisma models, TS types. ~85 lines. |
| 2 | WhatsApp Client + Service | PR 2 | Low-level Meta API HTTP client + WhatsAppService real implementation. Depends on Unit 1. ~150 lines. |
| 3 | Conversation + Webhook | PR 3 | State machine, intent detection, webhook verify & process. Depends on Unit 2. ~200 lines. |
| 4 | Reminders + Slots + Cron | PR 4 | Reminder sweep, available-slots endpoint, cron wiring, send endpoint. Depends on Units 1-3. ~215 lines. |

## Phase 1: Foundation (Database & Types)

- [x] 1.1 Add `ConversationDirection` enum and `ConversationStateEnum` to `prisma/schema.prisma`
- [x] 1.2 Add `WhatsAppMessage` model: waMessageId (unique), phoneNumber, body, direction, templateName?, appointmentId FK→Appointment
- [x] 1.3 Add `ConversationState` model: phoneNumber (indexed), currentState, context (Json default {}), updatedAt
- [x] 1.4 Add `whatsappReminderSent` field (String? enum: null|24h_sent|2h_sent) to Appointment
- [x] 1.5 Run `prisma migrate dev --name add_whatsapp_models` and `prisma generate`
- [x] 1.6 Add `WhatsAppMessage`, `ConversationState`, `WhatsAppWebhookPayload`, `AvailableSlot` types to `src/types/index.ts`
- [x] 1.7 Add `node-cron` (dep) and `@types/node-cron` (devDep) to `package.json`
- [x] 1.8 Add `WHATSAPP_BUSINESS_ACCOUNT_ID`, `DENTIST_USER_ID`, `CRON_SECRET` to `.env.example`

## Phase 2: WhatsApp Client & Service ✅ COMPLETE

- [x] 2.1 Create `src/lib/whatsapp/client.ts`: `sendText()`, `sendTemplate()`, `markAsRead()` — POST /v21.0/{phoneId}/messages, Bearer auth, retry once on 5xx
- [x] 2.2 Rewrite `src/services/whatsapp.service.ts`: implement `sendMessage`, `sendAppointmentReminder` (template params), `processIncomingMessage` (Patient lookup/auto-create by phone, ConversationState lookup/create)
- [x] 2.3 Add `sendInteractiveButtons(phone, buttons[])` — type:interactive with action.buttons[] (max 3 per Meta API)
- [x] 2.4 Add `sendInteractiveList(phone, sections)` — type:interactive with section_rows[] for appointment picker

## Phase 3: Conversation State Machine & Webhook ✅ COMPLETE

- [x] 3.1 Create `src/services/conversation.service.ts`: `detectIntent(text)` ordered regex — greet (hola|buenos), schedule (agendar|cita|turno), cancel (cancelar|anular), check (consultar|ver), help fallback
- [x] 3.2 Add `transition(state, intent)` — IDLE→SERVICE_SELECTION→DATE_SELECTION→TIME_SELECTION→CONFIRMATION→COMPLETED; "cancelar" aborts to IDLE from any state
- [x] 3.3 Add `handleMessage(phone, text)`: detectIntent→route to state handler (schedule via AppointmentService with DENTIST_USER_ID, cancel, list by phone)
- [x] 3.4 Slot collision re-check at confirmation: re-verify availability via `getAvailableSlots()` before `schedule()`; if taken, offer re-select
- [x] 3.5 >5min state timeout auto-reset: `getConversationState` auto-clears expired states via TTL
- [x] 3.6 Rewrite `src/app/api/whatsapp/webhook/route.ts` GET: verify hub.verify_token → 200+challenge or 403
- [x] 3.7 POST webhook: validate HMAC-SHA256 signature (X-Hub-Signature-256), parse messages, delegate to WhatsAppService → ConversationService

## Phase 4: Reminders & Supporting Endpoints ✅ COMPLETE

- [x] 4.1 `getAvailableSlots(date, userId)` implemented in `WhatsAppService` (1-hour blocks, 8:00–18:00, lunch excluded) — reused by both the API endpoint and the conversation flow
- [x] 4.2 Create `src/app/api/appointments/available-slots/route.ts`: GET ?date=YYYY-MM-DD, session auth, 401 if unauthenticated
- [x] 4.3 Create `src/services/reminder.service.ts`: `sendAppointmentReminders()` — query CONFIRMED appointments, 24h±30min window→flag=24h_sent, 2h±15min+flag=24h_sent→flag=2h_sent
- [x] 4.4 Idempotent flag progression (null→24h_sent→2h_sent) + error isolation: log failed send, continue batch
- [x] 4.5 Create `src/instrumentation.ts`: register node-cron `*/15 * * * *` calling `sendAppointmentReminders()`, active when `CRON_ENABLED=true`
- [x] 4.6 Create `src/app/api/whatsapp/cron/reminders/route.ts`: GET fallback, verify `x-cron-secret` header → call ReminderService
- [x] 4.7 Create `src/app/api/whatsapp/send/route.ts`: POST with session auth (ADMIN-only), body {phone, text}, delegate to WhatsAppService, persist outbound WhatsAppMessage ✅ (completed in PR 3)
