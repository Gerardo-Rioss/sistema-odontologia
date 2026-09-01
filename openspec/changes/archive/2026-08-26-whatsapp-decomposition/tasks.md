# Tasks: WhatsAppService Decomposition

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350 (3 new files + 5 import updates + types + deletion) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Interface Definitions

- [x] 1.1 Add `IWhatsAppClient`, `IConversationStateRepository`, `IAppointmentReader` interfaces to `src/services/types.ts` (Design §Interfaces)

## Phase 2: Core Service Extraction

- [x] 2.1 Create `src/services/conversation-state.service.ts` — extract `getConversationState`, `saveConversationState`, `clearConversationState`, `toConversationState`, `addMinutes`, `CONVERSATION_TTL_MINUTES` from `whatsapp.service.ts`. Class `ConversationStateService(prisma)`, singleton export `conversationStateService`.
- [x] 2.2 Create `src/services/slot.service.ts` — extract `getAvailableSlots` from `whatsapp.service.ts`. Class `SlotService(appointmentRepo)`, singleton export `slotService`. Import `BUSINESS_HOURS` from `@/lib/constants`.
- [x] 2.3 Create `src/services/whatsapp-messaging.service.ts` — extract `processIncomingMessage`, `sendMessage`, `sendTemplate`, `sendInteractiveList`, `markAsRead`, `getPatientByPhone` from `whatsapp.service.ts`. Class `WhatsAppMessagingService(prisma, client, patientRepo)`, singleton export `whatsappMessaging`.

## Phase 3: Consumer Updates

- [x] 3.1 Update `src/services/conversation.service.ts` — replace `import { whatsappService }` with imports from `conversation-state.service`, `whatsapp-messaging.service`, and `slot.service`.
- [x] 3.2 Update `src/services/reminder.service.ts` — replace `import { whatsappService }` with `import { whatsappMessaging }` from `whatsapp-messaging.service`.
- [x] 3.3 Update `src/app/api/whatsapp/webhook/route.ts` — replace `import { whatsappService }` with `import { whatsappMessaging }` from `whatsapp-messaging.service`.
- [x] 3.4 Update `src/app/api/whatsapp/send/route.ts` — replace `import { whatsappService }` with `import { whatsappMessaging }` from `whatsapp-messaging.service`.
- [x] 3.5 Update `src/app/api/appointments/available-slots/route.ts` — replace `import { whatsappService }` with `import { slotService }` from `slot.service`.

## Phase 4: Cleanup

- [x] 4.1 Delete `src/services/whatsapp.service.ts`.
- [x] 4.2 Run `npm run type-check` — zero new errors introduced (3 pre-existing errors in unrelated files).

## Phase 5: Testing

- [x] 5.1 Create `tests/unit/services/conversation-state.test.ts` — mock Prisma, test TTL expiry, context merge, idempotent clear (Spec: whatsapp-conversation-state scenarios).
- [x] 5.2 Create `tests/unit/services/slot.test.ts` — mock `IAppointmentReader`, test all-slots-available, booked-slot, cancelled-slot, lunch-exclusion (Spec: whatsapp-slot-computation scenarios).
- [x] 5.3 Create `tests/unit/services/whatsapp-messaging.test.ts` — mock `IWhatsAppClient` + Prisma, test inbound parse, outbound persistence, failed-send audit, patient lookup/create (Spec: whatsapp-messaging-service scenarios).
- [x] 5.4 Run `npm test` — all existing + new tests pass (488 passing, 0 failing).
- [ ] 5.5 Run `npm run build` — production build succeeds.
