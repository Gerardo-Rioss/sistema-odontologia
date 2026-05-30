# WhatsApp Webhook Specification

## Purpose
Receives and verifies Meta WhatsApp Cloud API v21.0+ webhooks. Handles hub.challenge verification (GET), parses inbound messages (POST), validates HMAC-SHA256 signatures, and persists every received message.

## Requirements

| # | Requirement | Method | Success | Auth | Errors |
|---|-------------|--------|---------|------|--------|
| R1 | Verify webhook | GET /api/whatsapp/webhook | 200 + challenge | Token | 403 |
| R2 | Receive message | POST /api/whatsapp/webhook | 200 | HMAC-SHA256 | 401, 400 |
| R3 | Persist inbound message | — | — | — | — |

R1: SHALL respond to GET with `hub.challenge` by returning the challenge value. MUST verify `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN` env var. Mismatch → 403.

R2: SHALL accept POST with JSON body containing `entry[0].changes[0].value.messages[]`. MUST validate `X-Hub-Signature-256` header via HMAC-SHA256 with `WHATSAPP_APP_SECRET`. Invalid → 401. Non-message payloads (statuses) → 200 OK, ignored.

R3: Every inbound message SHALL be persisted as `WhatsAppMessage` with `waMessageId`, `from` phone, `body`, `direction=INBOUND`, `timestamp`.

### Scenarios

#### Scenario: Successful webhook verification
- GIVEN `WHATSAPP_VERIFY_TOKEN="token123"`
- WHEN GET with `?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=token123`
- THEN 200, body="abc"

#### Scenario: Failed verification — wrong token
- GIVEN `WHATSAPP_VERIFY_TOKEN="token123"`
- WHEN GET with `hub.verify_token=wrong`
- THEN 403

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
