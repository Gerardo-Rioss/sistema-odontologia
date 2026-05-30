# WhatsApp Messaging Specification

## Purpose
Sends outbound WhatsApp messages via Meta Cloud API v21.0+ `POST /{phone-number-id}/messages`. Supports text messages, pre-approved templates, and interactive reply buttons. All messages persisted locally.

## Requirements

| # | Requirement | Message Type | Template |
|---|-------------|-------------|----------|
| R1 | Send text | text | — |
| R2 | Send appointment confirmation | template | appointment_confirmation |
| R3 | Send 24h reminder | template | appointment_reminder_24h |
| R4 | Send 2h reminder | template | appointment_reminder_2h |
| R5 | Send cancellation confirmation | template | cancellation_confirmation |
| R6 | Send interactive buttons | interactive | — |
| R7 | Persist outbound message | — | — |

R1: SHALL send `{type:"text", text:{body}}` with `to` recipient. MUST use `WHATSAPP_ACCESS_TOKEN` bearer auth. Failure → log + retry once.

R2–R5 template parameters: `patientName`, `serviceType`, `date` (DD/MM/YYYY), `time` (HH:mm). R3–R4 additionally include `clinicPhone`. Language: `es`.

R6: SHALL use `type:"interactive"` with `action.buttons[]` (max 3) or `section_rows[]` (list picker).

R7: Every outbound message SHALL be persisted as `WhatsAppMessage` with `waMessageId` from API response, `direction=OUTBOUND`, `templateName` when template.

### Scenarios

#### Scenario: Send text message
- GIVEN valid access token
- WHEN sendText({to:"+549...", body:"Hola"})
- THEN POST /messages returns 200 with `messages[0].id`, persisted

#### Scenario: Send confirmation template
- GIVEN appointment: patient="Juan", type="LIMPIEZA", date="2026-06-15", time="10:00"
- WHEN sendAppointmentConfirmation(appointment, "+549...")
- THEN template sent, WhatsAppMessage persisted with templateName="appointment_confirmation"

#### Scenario: API failure retries once
- GIVEN Cloud API returns 500
- WHEN sendText called
- THEN retried once; if still fails → error logged, no crash

#### Scenario: Interactive buttons for service selection
- GIVEN conversation at service_selection
- WHEN sendInteractive with buttons: ["Limpieza", "Revisión", "Urgencia"]
- THEN interactive message sent, user can tap to reply

#### Scenario: Interactive list for appointment selection
- GIVEN patient has 2 appointments for cancellation
- WHEN sendInteractive with section_rows
- THEN list picker sent, user selects one appointment
