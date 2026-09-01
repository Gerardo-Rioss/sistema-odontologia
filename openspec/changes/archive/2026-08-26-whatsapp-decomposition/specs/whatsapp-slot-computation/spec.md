# WhatsApp Slot Computation Specification

## Purpose

Computes available 1-hour appointment slots for a given date and dentist. Business hours 8:00–18:00, lunch block 13:00–14:00 excluded. Extracted from WhatsAppService.

## Requirements

### Requirement: Get Available Slots

The system SHALL return a list of 1-hour time slots for the given date and dentist. Slots from 8:00 to 17:00 (exclusive of 13:00 lunch hour). Each slot MUST be marked `available: true` or `false` based on non-CANCELLED appointments for that date/time.

#### Scenario: All slots available

- GIVEN dentist with no appointments on "2026-06-15"
- WHEN getAvailableSlots("2026-06-15", userId)
- THEN returns 9 slots (8:00–12:00, 14:00–17:00), all `available: true`

#### Scenario: Slot booked by confirmed appointment

- GIVEN dentist has CONFIRMED appointment at "10:00" on "2026-06-15"
- WHEN getAvailableSlots("2026-06-15", userId)
- THEN slot at "10:00" has `available: false`, others `available: true`

#### Scenario: Cancelled appointment does not block slot

- GIVEN dentist has CANCELLED appointment at "10:00" on "2026-06-15"
- WHEN getAvailableSlots("2026-06-15", userId)
- THEN slot at "10:00" has `available: true`

#### Scenario: Lunch hour excluded

- WHEN getAvailableSlots("2026-06-15", userId)
- THEN no slot at "13:00" in the result list
