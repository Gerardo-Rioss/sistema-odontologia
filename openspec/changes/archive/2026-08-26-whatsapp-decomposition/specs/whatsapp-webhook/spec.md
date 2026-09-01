# Delta for WhatsApp Webhook

## MODIFIED Requirements

### Requirement: Receive Message

The system SHALL accept POST with JSON body containing `entry[0].changes[0].value.messages[]`. MUST validate `X-Hub-Signature-256` header via HMAC-SHA256 with `WHATSAPP_APP_SECRET`. Invalid → 401. Non-message payloads (statuses) → 200 OK, ignored.

The system imports messaging operations from `whatsapp-messaging.service` instead of the monolithic `whatsapp.service`. No behavioral changes.

(Previously: Messaging operations imported from `whatsapp.service`)

#### Scenario: Receive text message

- GIVEN valid HMAC-SHA256 signature
- WHEN POST with entry containing `messages:[{from:"+549...", text:{body:"hola"}}]`
- THEN 200, WhatsAppMessage persisted with body="hola"

#### Scenario: Invalid signature rejection

- WHEN POST with invalid X-Hub-Signature-256
- THEN 401

#### Scenario: Non-message payload ignored

- WHEN POST with entry containing `statuses` (no messages array)
- THEN 200 OK, no record persisted
