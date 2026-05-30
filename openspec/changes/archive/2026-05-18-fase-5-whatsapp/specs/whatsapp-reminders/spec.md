# WhatsApp Reminders Specification

## Purpose
Automated appointment reminders sent via WhatsApp templates. A cron-triggered endpoint queries upcoming CONFIRMED appointments and dispatches reminder templates 24h and 2h before the scheduled time. Idempotent via `whatsappReminderSent` flag progression.

## Requirements

### Requirement: Reminder Cron Endpoint
The system SHALL expose `GET /api/whatsapp/cron/reminders` invoked by `node-cron` every 15 minutes (`*/15 * * * *`). It MUST query CONFIRMED appointments where `whatsappReminderSent` is null or `24h_sent`.

### Requirement: 24-Hour Reminder
For appointments 24h ± 30min away, SHALL send `appointment_reminder_24h` template. MUST set `whatsappReminderSent=24h_sent`.

### Requirement: 2-Hour Reminder
For appointments 2h ± 15min away with `whatsappReminderSent=24h_sent`, SHALL send `appointment_reminder_2h` template. MUST set `whatsappReminderSent=2h_sent`.

### Requirement: Idempotency
The flag progression `null` → `24h_sent` → `2h_sent` SHALL prevent duplicate sends. Appointments with `2h_sent` SHALL NOT be re-queried.

### Requirement: Error Isolation
A single failed send SHALL NOT block other reminders. Failures SHALL be logged with appointmentId and phoneNumber.

### Scenarios

#### Scenario: 24h reminder sent
- GIVEN appointment CONFIRMED at 2026-06-15 10:00, current=2026-06-14 10:00, flag=null
- WHEN cron triggers
- THEN reminder_24h template sent, flag=24h_sent

#### Scenario: 2h reminder sent
- GIVEN appointment flag=24h_sent, current=2026-06-15 08:00
- WHEN cron triggers
- THEN reminder_2h template sent, flag=2h_sent

#### Scenario: No duplicate reminder
- GIVEN appointment flag=2h_sent
- WHEN cron triggers again
- THEN appointment skipped, no message sent

#### Scenario: Appointment outside window ignored
- GIVEN appointment at 2026-06-15 10:00, current=2026-06-13 10:00
- WHEN cron triggers
- THEN appointment skipped (>24h away)

#### Scenario: Failed send does not block batch
- GIVEN 3 appointments due for reminder, 2nd patient phone invalid
- WHEN cron triggers
- THEN 2 reminders sent, 1 failure logged, no crash
