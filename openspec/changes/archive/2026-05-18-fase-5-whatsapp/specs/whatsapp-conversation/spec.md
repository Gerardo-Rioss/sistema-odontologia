# WhatsApp Conversation Specification

## Purpose
State-machine-driven conversational flow for dental appointment booking via WhatsApp. Keyword-based intent detection (no ML), guided multi-step scheduling with slot availability checking, and appointment creation/cancellation through AppointmentService.

## Requirements

### Requirement: Conversation State Machine
The system SHALL maintain per-patient conversation state: `idle` → `greeting` → `service_selection` → `date_selection` → `time_selection` → `confirmation` → `completed`. State persisted in `ConversationState` model keyed by `phoneNumber`. Context JSON stores `{selectedService, selectedDate, selectedTime, appointmentId}`.

### Requirement: Keyword Intent Detection
The system SHALL detect intents via keyword+regex on message text (Spanish only). Mapping:

| Intent | Keywords |
|--------|----------|
| greet | hola, buenos días, buenas tardes |
| schedule | agendar, cita, turno, reservar |
| cancel | cancelar, anular, dar de baja |
| check | consultar, ver, mis citas |
| help | ayuda, opciones, menú |

Unknown/unmatched text → `help` intent as fallback.

### Requirement: Scheduling Flow
The system SHALL guide: service selection → date → available time slot → confirmation. MUST validate input at each step. "cancelar" at any step MUST abort and reset to idle. On confirmation, SHALL create Appointment via `AppointmentService` with status=PENDING.

### Requirement: Slot Collision Prevention
Before creating Appointment at confirmation step, SHALL re-check slot availability via `AppointmentService.getAvailableSlots()`. If slot was taken during conversation → error message + return to date selection.

### Requirement: Cancellation Flow
The system SHALL retrieve patient's CONFIRMED appointments by phone, present for selection, and call `AppointmentService.cancel(appointmentId)`.

### Scenarios

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
