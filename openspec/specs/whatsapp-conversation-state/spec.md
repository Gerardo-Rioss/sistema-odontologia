# WhatsApp Conversation State Specification

## Purpose

TTL-based conversation state CRUD keyed by phone number. Manages the state machine persistence for WhatsApp conversational flows. Extracted from WhatsAppService.

## Requirements

### Requirement: Get Conversation State

The system SHALL retrieve the most recent `ConversationState` for a phone number. MUST automatically delete and return `null` if the record's `expiresAt` is in the past. MUST return `null` if no record exists.

#### Scenario: Return active state

- GIVEN conversation state exists for "+549..." with `expiresAt` in the future
- WHEN getConversationState("+549...")
- THEN returns ConversationState with currentState, context, expiresAt

#### Scenario: Return null if expired

- GIVEN conversation state exists with `expiresAt` in the past
- WHEN getConversationState("+549...")
- THEN record is deleted, returns `null`

#### Scenario: Return null if no state

- GIVEN no conversation state for "+549..."
- WHEN getConversationState("+549...")
- THEN returns `null`

### Requirement: Save Conversation State

The system SHALL create or update the conversation state for a phone number. MUST set `expiresAt` to current time + 5 minutes. If existing state found, MUST merge context JSON (new fields override). MUST return the saved ConversationState.

#### Scenario: Create new state

- GIVEN no existing state for "+549..."
- WHEN saveConversationState("+549...", "service_selection", {selectedService: "LIMPIEZA"})
- THEN new record created, expiresAt = now + 5min, returns state with context

#### Scenario: Update existing state

- GIVEN existing state for "+549..." with context `{selectedService: "LIMPIEZA"}`
- WHEN saveConversationState("+549...", "date_selection", {selectedDate: "2026-06-15"})
- THEN record updated, context merged to `{selectedService: "LIMPIEZA", selectedDate: "2026-06-15"}`, expiresAt refreshed

### Requirement: Clear Conversation State

The system SHALL delete all conversation state records for a phone number. MUST be idempotent (no error if none exist).

#### Scenario: Delete existing state

- GIVEN conversation state exists for "+549..."
- WHEN clearConversationState("+549...")
- THEN record deleted, returns void

#### Scenario: Clear with no state is idempotent

- GIVEN no conversation state for "+549..."
- WHEN clearConversationState("+549...")
- THEN no error, returns void
