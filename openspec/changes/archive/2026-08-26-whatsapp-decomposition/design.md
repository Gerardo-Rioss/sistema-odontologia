# Design: WhatsAppService Decomposition

## Technical Approach

Extract `WhatsAppService` (413 lines, 7 responsibilities) into 3 focused modules via extract-by-responsibility. Each module receives its Prisma client and repository dependencies via constructor injection (following the `AppointmentService` pattern in `src/services/types.ts`). Consumers update imports from `whatsappService` to the specific module. Character-for-character logic move — no behavioral changes.

## Architecture Decisions

### Decision: Constructor DI over singleton-import pattern

**Choice**: Constructor injection with interfaces in `src/services/types.ts`
**Alternatives considered**: Keep current pattern (direct `prisma`/repository imports inside class)
**Rationale**: Matches `AppointmentService` DI pattern already in codebase. Enables testability without `jest.mock()` — mock via constructor args. Each module can be tested independently.

### Decision: `getPatientByPhone` stays in messaging module

**Choice**: Keep patient lookup in `WhatsAppMessagingService`
**Alternatives considered**: Move to `PatientService` now
**Rationale**: Proposal explicitly defers this. Moving now couples two refactors. The messaging module already depends on `patientRepository` for the auto-create flow. Future change can extract it.

### Decision: Constants move to consuming module

**Choice**: `CONVERSATION_TTL_MINUTES` → `conversation-state.service.ts`, `BUSINESS_HOURS` stays in `@/lib/constants`
**Alternatives considered**: Create shared `whatsapp.constants.ts`
**Rationale**: Each constant is used by exactly one module. Colocation reduces indirection. `BUSINESS_HOURS` is already shared across services.

## Data Flow

```
webhook/route.ts ──→ whatsappMessaging.processIncomingMessage()
                  ──→ conversationService.handleMessage()
                        ├── conversationState.getConversationState()
                        ├── conversationState.saveConversationState()
                        ├── conversationState.clearConversationState()
                        ├── slotService.getAvailableSlots()
                        └── whatsappMessaging.sendMessage/sendTemplate/sendInteractiveList()

send/route.ts ──→ whatsappMessaging.sendMessage()

reminder.service.ts ──→ whatsappMessaging.sendTemplate()

available-slots/route.ts ──→ slotService.getAvailableSlots()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/whatsapp-messaging.service.ts` | Create | Meta Cloud API calls (`sendMessage`, `sendTemplate`, `sendInteractiveList`, `markAsRead`, `processIncomingMessage`) + outbound/inbound message persistence + `getPatientByPhone` |
| `src/services/conversation-state.service.ts` | Create | TTL-based conversation state CRUD (`getConversationState`, `saveConversationState`, `clearConversationState`) + `toConversationState` helper + `addMinutes` helper + `CONVERSATION_TTL_MINUTES` constant |
| `src/services/slot.service.ts` | Create | Available slot computation (`getAvailableSlots`) + `BUSINESS_HOURS` import |
| `src/services/types.ts` | Modify | Add `IWhatsAppClient`, `IConversationStateRepository`, `IAppointmentReader` interfaces |
| `src/services/conversation.service.ts` | Modify | Import from `conversation-state.service`, `whatsapp-messaging.service`, `slot.service` (3 imports replace 1) |
| `src/services/reminder.service.ts` | Modify | Import `whatsappMessaging` from `whatsapp-messaging.service` |
| `src/app/api/whatsapp/webhook/route.ts` | Modify | Import `whatsappMessaging` from `whatsapp-messaging.service` |
| `src/app/api/whatsapp/send/route.ts` | Modify | Import `whatsappMessaging` from `whatsapp-messaging.service` |
| `src/app/api/appointments/available-slots/route.ts` | Modify | Import `slotService` from `slot.service` |
| `src/services/whatsapp.service.ts` | Delete | Replaced by 3 focused modules |

## Interfaces / Contracts

Add to `src/services/types.ts`:

```typescript
// ─── WhatsApp Messaging ───────────────────────────────────────
export interface IWhatsAppClient {
  sendTextMessage(phone: string, text: string): Promise<WhatsAppClientResponse>;
  sendTemplateMessage(phone: string, template: string, lang?: string): Promise<WhatsAppClientResponse>;
  sendInteractiveList(phone: string, header: string, body: string, button: string, sections: InteractiveSection[]): Promise<WhatsAppClientResponse>;
  markMessageAsRead(messageId: string): Promise<WhatsAppClientResponse>;
}

// ─── Conversation State ───────────────────────────────────────
export interface IConversationStateRepository {
  findFirst(args: { where: { phoneNumber: string }; orderBy: { updatedAt: "desc" } }): Promise<ConversationStateRecord | null>;
  create(args: { data: ConversationStateCreateInput }): Promise<ConversationStateRecord>;
  update(args: { where: { id: string }; data: ConversationStateUpdateInput }): Promise<ConversationStateRecord>;
  delete(args: { where: { id: string } }): Promise<void>;
  deleteMany(args: { where: { phoneNumber: string } }): Promise<void>;
}

// ─── Slot Computation ─────────────────────────────────────────
export interface IAppointmentReader {
  findByDentist(userId: string): Promise<AppointmentWithPatient[]>;
}
```

Each new service class:

```typescript
export class WhatsAppMessagingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly client: IWhatsAppClient,
    private readonly patientRepo: IPatientRepository,
  ) {}
}

export class ConversationStateService {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}
}

export class SlotService {
  constructor(
    private readonly appointmentRepo: IAppointmentReader,
  ) {}
}
```

Factory exports (singleton pattern):

```typescript
export const whatsappMessaging = new WhatsAppMessagingService(prisma, whatsappClient, patientRepository);
export const conversationStateService = new ConversationStateService(prisma);
export const slotService = new SlotService(appointmentRepository);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each module in isolation | Constructor injection — pass mock objects, no `jest.mock()` |
| Unit | `ConversationStateService` TTL expiry | Mock Prisma, verify delete on expired state |
| Unit | `SlotService` slot computation | Mock `IAppointmentReader`, verify lunch exclusion and booked-slot detection |
| Unit | `WhatsAppMessagingService` message persistence | Mock `IWhatsAppClient` + Prisma, verify outbound record creation |
| Integration | Consumer import resolution | `npm run type-check` + `npm test` pass |
| E2E | Webhook → conversation flow | Existing Playwright tests (no changes expected) |

No `jest.mock()` needed — all dependencies are constructor-injected. Test files: `tests/unit/services/whatsapp-messaging.test.ts`, `tests/unit/services/conversation-state.test.ts`, `tests/unit/services/slot.test.ts`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration required. This is a pure internal refactor:
1. Create 3 new service files with extracted logic
2. Add interfaces to `src/services/types.ts`
3. Update 5 consumer import paths
4. Delete `whatsapp.service.ts`
5. Verify: `npm run type-check` + `npm test` + `npm run build`

Single commit. Rollback: `git revert` restores `whatsapp.service.ts` instantly.

## Open Questions

- [ ] Should `IWhatsAppClient` abstract the raw `src/lib/whatsapp/client.ts` functions, or should the messaging service import them directly and only mock at Prisma level? (Current proposal: interface wrapper for full testability)
- [ ] Should factory functions accept optional overrides for DI, or hardcode the singletons? (Recommendation: hardcode singletons, match existing pattern)
