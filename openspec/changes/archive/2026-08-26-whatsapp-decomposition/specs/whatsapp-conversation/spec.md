# Delta for WhatsApp Conversation

## MODIFIED Requirements

### Requirement: Conversation State Machine

The system SHALL maintain per-patient conversation state: `idle` → `greeting` → `service_selection` → `date_selection` → `time_selection` → `confirmation` → `completed`. State persisted in `ConversationState` model keyed by `phoneNumber`. Context JSON stores `{selectedService, selectedDate, selectedTime, appointmentId}`.

The system imports conversation state operations from `conversation-state.service` instead of the monolithic `whatsapp.service`. No behavioral changes.

(Previously: Conversation state operations imported from `whatsapp.service`)

#### Scenario: Full scheduling happy path

- GIVEN state=idle, patient sends "hola"
- WHEN bot replies with service options → patient selects service → date → time → confirms
- THEN Appointment created PENDING, state=completed, confirmation template sent

#### Scenario: Abort mid-flow

- GIVEN state=service_selection
- WHEN patient sends "cancelar"
- THEN state→idle, "Operación cancelada" reply

#### Scenario: Slot collision at confirmation

- GIVEN state=confirmation, selected slot becomes unavailable
- WHEN bot attempts AppointmentService.create() → slot taken
- THEN message: "Ese horario ya no está disponible", offer new date selection

#### Scenario: Cancel existing appointment

- GIVEN patient has 2 CONFIRMED appointments, sends "cancelar"
- WHEN bot lists appointments, patient selects one
- THEN appointment→CANCELLED, cancellation template sent

#### Scenario: Unknown input falls back to help

- GIVEN state=idle, patient sends "asdfgh"
- WHEN intent detection runs
- THEN help intent triggered, options menu sent
