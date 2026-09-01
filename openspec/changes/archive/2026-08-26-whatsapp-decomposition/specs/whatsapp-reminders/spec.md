# Delta for WhatsApp Reminders

## MODIFIED Requirements

### Requirement: Reminder Cron Endpoint

The system SHALL expose `GET /api/whatsapp/cron/reminders` invoked by `node-cron` every 15 minutes (`*/15 * * * *`). It MUST query CONFIRMED appointments where `whatsappReminderSent` is null or `24h_sent`.

The system imports messaging operations from `whatsapp-messaging.service` instead of the monolithic `whatsapp.service`. No behavioral changes.

(Previously: Messaging operations imported from `whatsapp.service`)

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
