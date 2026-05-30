# Design: Integración WhatsApp — Bot Conversacional

## Technical Approach

WhatsAppService wraps Meta Cloud API v21.0 direct HTTP calls. ConversationService implements a keyword-based intent detector driving a persistent state machine. Reminders run via `node-cron` registered in Next.js `instrumentation.ts`, querying CONFIRMED appointments and sending pre-approved templates. The bot operates under a configurable `DENTIST_USER_ID` — the sole appointment owner for WhatsApp-created bookings.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| State machine persistence | PostgreSQL via `ConversationState` model per phone | In-memory Map, Redis | Survives server restarts; matches existing Prisma patterns; no infra dependency |
| Intent detection | Ordered regex keyword matching (Spanish) | LLM/OpenAI, Dialogflow, string `.includes()` | Zero-latency, no external dependency, predictable; regex allows word-boundary matching to avoid false positives |
| Reminder scheduler | `node-cron` in `instrumentation.ts` (in-process) | External cron hitting HTTP endpoint, BullMQ | Simplest deployment — no external cron config; cron endpoint kept as fallback trigger |
| Bot auth for appointments | Env var `DENTIST_USER_ID` — no session | OAuth, API key per patient | Appointments require a userId; single-practice MVP; future: multi-dentist selection in conversation flow |
| Patient lookup | Match by phone number; auto-create if not found | Require pre-registration, OTP verification | Frictionless UX for first-time WhatsApp patients; Patient record deduplication by phone |
| Slot verification | Double-check availability at confirmation time (not just at display) | Trust displayed slots only | Prevents race condition: slot taken between display and confirmation |
| Rate limiting | Simple in-memory count per phone (10 req/min) | Redis, no rate limit | Protects against spam; acceptable for single-server MVP; no Redis dependency |
| Message queue | Fire-and-forget `await` (synchronous) | BullMQ, in-memory queue | Proposal scope excludes queues; async fire-and-forget is acceptable for MVP volume (<250 msgs/day) |

## Data Flow

```
WhatsApp User → Meta Server → POST /api/whatsapp/webhook
    │
    ├─ 1. Verify X-Hub-Signature-256 (HMAC-SHA256)
    ├─ 2. Parse JSON payload → extract phone, text, waMessageId
    ├─ 3. Rate-limit check (in-memory store, 10/min per phone)
    ├─ 4. WhatsAppService.processIncomingMessage()
    │      ├─ Lookup/create Patient by phone
    │      ├─ Lookup/create ConversationState by phone
    │      ├─ ConversationService.handleMessage(text, state)
    │      │     ├─ detectIntent(text, state) → Intent
    │      │     ├─ transition(state.currentState, intent) → nextState + response
    │      │     └─ Execute actions:
    │      │           BOOK: AppointmentService.getAvailableSlots() / schedule()
    │      │           CANCEL: AppointmentService.cancel()
    │      │           VIEW: AppointmentService.getAll()
    │      ├─ Persist WhatsAppMessage (INBOUND + OUTBOUND)
    │      └─ Update ConversationState
    └─ 5. Return 200 OK (acknowledgement within 20s)
```

```
node-cron (every 5 min, instrumentation.ts)
    │
    └─ ReminderService.processReminders()
          ├─ Query: CONFIRMED appointments NOT flagged
          │    WHERE (date = today AND time BETWEEN now+2h-window)
          │       OR (date = tomorrow AND time BETWEEN now+24h-window)
          ├─ Send template: "recordatorio_cita" (pre-approved)
          ├─ Set flag: whatsappReminderSent24h / whatsappReminderSent2h
          └─ Persist WhatsAppMessage (OUTBOUND)
```

## State Machine

```
IDLE ──"agendar"──→ AWAITING_SERVICE ──type──→ AWAITING_DATE ──date──→ AWAITING_TIME
  ↑                      │                         │                      │
  │                 "cancelar"               "cancelar"             "cancelar"
  │                      ↓                         ↓                      ↓
  └──────────────────── IDLE ←─────────────────────────────────────────────────
                                                                              │
AWAITING_TIME ──time──→ AWAITING_CONFIRMATION ──"sí"/"confirmar"──→ IDLE (cita creada)
                              │
                         "no"/"cancelar" ──→ IDLE
```

Timeout: any non-IDLE state >5 min → auto-reset to IDLE (swept by cron alongside reminders).

Context stored in `ConversationState.contextData` (JSON): `{ serviceType, selectedDate, selectedTime, appointmentId }`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/whatsapp/client.ts` | **Create** | Low-level HTTP client: `sendText()`, `sendTemplate()`, `markAsRead()` against Meta API |
| `src/services/whatsapp.service.ts` | **Modify** | Replace stub: implement `sendMessage`, `sendAppointmentReminder`, `processIncomingMessage` |
| `src/services/conversation.service.ts` | **Create** | State machine + intent detector (`detectIntent`, `transition`, `handleMessage`) |
| `src/services/reminder.service.ts` | **Create** | `processReminders()` — query upcoming CONFIRMED appointments, send templates, set flags |
| `src/app/api/whatsapp/webhook/route.ts` | **Modify** | Full GET verify + POST signature check, rate-limit, delegate to WhatsAppService |
| `src/app/api/whatsapp/send/route.ts` | **Create** | POST endpoint for dashboard manual send (auth required) |
| `src/app/api/whatsapp/cron/reminders/route.ts` | **Create** | Fallback cron HTTP trigger (secret-token protected) |
| `src/app/api/appointments/available-slots/route.ts` | **Create** | `GET ?date=YYYY-MM-DD` → `[{time, available}]` |
| `src/services/appointment.service.ts` | **Modify** | Add `getAvailableSlots(date: string)` |
| `src/instrumentation.ts` | **Create** | Next.js instrumentation hook: register `node-cron` job for reminders |
| `prisma/schema.prisma` | **Modify** | +`WhatsAppMessage` model, +`ConversationState` model, +`Appointment.whatsappReminderSent24h`, +`Appointment.whatsappReminderSent2h` |
| `src/types/index.ts` | **Modify** | +`WhatsAppMessage`, +`ConversationState`, +`WhatsAppWebhookPayload`, +`AvailableSlot` |
| `.env.example` | **Modify** | +`WHATSAPP_BUSINESS_ACCOUNT_ID`, +`DENTIST_USER_ID`, +`CRON_SECRET` |
| `package.json` | **Modify** | +`node-cron`, devDep `@types/node-cron` |

## Interfaces / Contracts

```typescript
// Conversational intents
type Intent = "GREETING" | "BOOK_APPOINTMENT" | "CANCEL" | "VIEW_APPOINTMENTS" | "CHECK_SCHEDULE" | "DATE_SELECTED" | "TIME_SELECTED" | "CONFIRM" | "UNKNOWN";

// Conversation states
type ConversationStateEnum = "IDLE" | "AWAITING_SERVICE" | "AWAITING_DATE" | "AWAITING_TIME" | "AWAITING_CONFIRMATION";

// WhatsAppService public API
interface IWhatsAppService {
  sendText(phone: string, body: string): Promise<{ waMessageId: string }>;
  sendTemplate(phone: string, templateName: string, params: string[]): Promise<{ waMessageId: string }>;
  processIncomingMessage(payload: WhatsAppWebhookPayload): Promise<void>;
  sendAppointmentReminder(phone: string, patientName: string, dateTime: Date, hoursBefore: 2 | 24): Promise<void>;
}

// AppointmentService addition
interface IAppointmentService {
  // existing methods...
  getAvailableSlots(date: string): Promise<{ time: string; available: boolean }[]>;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `detectIntent()` keyword matching | Table-driven: input text → expected Intent |
| Unit | State transitions | Allowed transitions matrix; invalid transitions → error |
| Unit | `getAvailableSlots()` logic | Fixed appointment set → computed free 30-min slots 9:00-18:00 |
| Integration | Webhook POST → conversation flow | Mock Meta API HTTP calls; POST webhook payload; assert ConversationState transitions + WhatsAppMessage persisted + Appointment created |
| Integration | Signature verification | Valid and invalid X-Hub-Signature-256 → 200 vs 401 |
| Integration | Reminder sweep | Seed CONFIRMED appointments at 24h/2h boundaries; run `processReminders()`; assert flags set + templates sent |
| E2E | Full booking flow | (future) Real Meta webhook delivery test with ngrok |

## Migration / Rollout

- Prisma migration adds 2 new tables + 2 columns. No data migration needed (all new entities).
- `DENTIST_USER_ID` must be set in env before bot functions.
- `node-cron` starts only in production (`NODE_ENV=production`) to avoid duplicate runs in dev.
- Templates must be pre-approved in Meta Business Manager before reminder sends work.
- Rollback: revert migration, remove `node-cron`, restore stubs per proposal.

## Open Questions

- [ ] What is the dentist user ID for production? (set `DENTIST_USER_ID` env)
- [ ] Are the Meta template names (`recordatorio_cita`, `confirmacion_cita`, `cancelacion_cita`) already approved?
- [ ] Should reminders also go via email (`NotificationService`) if WhatsApp send fails?
