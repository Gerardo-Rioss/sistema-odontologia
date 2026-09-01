# Proposal: WhatsAppService Decomposition

## Intent

`WhatsAppService` (413 lines, 7 responsibilities) is a God Object: Meta Cloud API calls, message persistence, conversation state TTL CRUD, patient lookup/auto-creation, and slot computation all live in one class. This violates SRP and creates a coupling surface where a change to slot logic risks breaking messaging. The goal is to extract 3 focused modules with clear boundaries, leaving `getPatientByPhone` in the messaging module (deferred to `PatientService` later).

## Scope

### In Scope
- Create `src/services/whatsapp-messaging.service.ts` — Meta Cloud API calls (`sendMessage`, `sendTemplate`, `sendInteractiveList`, `markAsRead`, `processIncomingMessage`) + outbound/inbound message persistence + `getPatientByPhone`
- Create `src/services/conversation-state.service.ts` — TTL-based conversation state CRUD (`getConversationState`, `saveConversationState`, `clearConversationState`) with `toConversationState` helper
- Create `src/services/slot.service.ts` — available slot computation (`getAvailableSlots`)
- Delete `src/services/whatsapp.service.ts`
- Update 5 consumers: `conversation.service.ts`, `reminder.service.ts`, `webhook/route.ts`, `send/route.ts`, `available-slots/route.ts`
- Unit tests for each new module

### Out of Scope
- ConversationService logic changes (imports only)
- Prisma schema changes
- WhatsApp client library changes
- Moving `getPatientByPhone` to `PatientService` (future change)

## Capabilities

### New Capabilities
- `whatsapp-messaging-service`: Meta Cloud API messaging, message persistence, patient lookup by phone — extracted from WhatsAppService
- `whatsapp-conversation-state`: TTL-based conversation state CRUD keyed by phone number — extracted from WhatsAppService
- `whatsapp-slot-computation`: Available appointment slot computation for a given date/dentist — extracted from WhatsAppService

### Modified Capabilities
- `whatsapp-conversation`: Import path changes from `whatsapp.service` to `conversation-state.service`; no behavioral changes
- `whatsapp-reminders`: Import path changes from `whatsapp.service` to `whatsapp-messaging.service`; no behavioral changes
- `whatsapp-webhook`: Import path changes from `whatsapp.service` to `whatsapp-messaging.service`; no behavioral changes

## Approach

Extract-by-responsibility: each module gets its own file with a named export class and singleton. Consumers update imports from `whatsappService` to the specific module they need. No constructor DI yet — singletons match current pattern. Shared constants (`CONVERSATION_TTL_MINUTES`, `BUSINESS_HOURS`) move to the module that uses them.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/services/whatsapp.service.ts` | Removed | Deleted after extraction |
| `src/services/whatsapp-messaging.service.ts` | New | Meta API calls + persistence + patient lookup |
| `src/services/conversation-state.service.ts` | New | Conversation state TTL CRUD |
| `src/services/slot.service.ts` | New | Available slot computation |
| `src/services/conversation.service.ts` | Modified | Import from `conversation-state.service` |
| `src/services/reminder.service.ts` | Modified | Import from `whatsapp-messaging.service` |
| `src/app/api/whatsapp/webhook/route.ts` | Modified | Import from `whatsapp-messaging.service` |
| `src/app/api/whatsapp/send/route.ts` | Modified | Import from `whatsapp-messaging.service` |
| `src/app/api/appointments/available-slots/route.ts` | Modified | Import from `slot.service` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import breakage across consumers | Low | Automated find-replace + type-check + tests pass |
| Circular dependency between modules | Low | No cross-references between extracted modules |
| Subtle behavior change during extraction | Low | Character-for-character logic move, no refactoring |

## Rollback Plan

Git revert of the single commit that performs the extraction. The old `whatsapp.service.ts` is deleted in the same commit, so reverting restores it instantly. No schema or API changes to undo.

## Dependencies

- None — this is a pure internal refactor with no external prerequisites.

## Success Criteria

- [ ] `npm run type-check` passes with zero errors
- [ ] `npm test` — all existing tests pass, new unit tests for each module pass
- [ ] `whatsapp.service.ts` is deleted
- [ ] Each new module has a focused responsibility (messaging, state, slots)
- [ ] All 5 consumers import from the correct new module
