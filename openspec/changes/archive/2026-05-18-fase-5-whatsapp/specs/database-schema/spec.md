# Delta for Database Schema

## ADDED Requirements

### Requirement: WhatsAppMessage Model
The system SHALL define a WhatsAppMessage model for persisting WhatsApp communication.

| Field | Type | Constraints |
|-------|------|------------|
| id | String | PK, @default(cuid()) |
| waMessageId | String | Unique, WhatsApp API message ID |
| phoneNumber | String | Required, patient WhatsApp number |
| body | String | Required, message text content |
| direction | Enum | INBOUND, OUTBOUND |
| templateName | String? | Template name if template message |
| appointmentId | String? | FK→Appointment, onDelete:SetNull |
| createdAt | DateTime | @default(now()) |

Enum: `MessageDirection` = INBOUND | OUTBOUND.
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
| context | Json | {selectedService, selectedDate, selectedTime, appointmentId} |
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
