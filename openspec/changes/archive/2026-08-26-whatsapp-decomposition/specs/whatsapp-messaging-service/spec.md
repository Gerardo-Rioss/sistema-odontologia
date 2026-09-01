# WhatsApp Messaging Service Specification

## Purpose

Focused module for Meta Cloud API messaging: inbound webhook parsing, outbound text/template/interactive sends with persistence, read receipts, and patient lookup by phone. Extracted from WhatsAppService.

## Requirements

### Requirement: Process Inbound Webhook

The system SHALL parse a Meta webhook payload, extract the first message's phone number, text (or interactive reply ID), and message ID. MUST persist an inbound `WhatsAppMessage` record. MUST throw if no entry, no change value, or no messages array is present.

#### Scenario: Parse text message

- GIVEN webhook payload with `messages[0].text.body="hola"` and `from="+549..."`
- WHEN processIncomingMessage called
- THEN returns `{phoneNumber, messageText, messageId}`, inbound record persisted

#### Scenario: Parse interactive reply

- GIVEN webhook payload with `messages[0].interactive.list_reply.id="opt_1"`
- WHEN processIncomingMessage called
- THEN messageText is `"opt_1"`, inbound record persisted

#### Scenario: Empty payload throws

- GIVEN webhook payload with no `entry`
- WHEN processIncomingMessage called
- THEN throws `"Invalid webhook payload: no entry found"`

### Requirement: Send Text Message

The system SHALL send a text message via Meta Cloud API and persist an outbound `WhatsAppMessage` with `direction=OUTBOUND`, `messageType=TEXT`. MUST persist even on API failure for audit trail.

#### Scenario: Successful text send

- GIVEN valid access token, recipient "+549..."
- WHEN sendMessage(phoneNumber, "Hola")
- THEN Meta API called, outbound record persisted with body="Hola"

#### Scenario: Failed text send persists audit record

- GIVEN Meta API returns 500
- WHEN sendMessage called
- THEN outbound record persisted with `waMessageId="failed-{timestamp}"`, error propagated

### Requirement: Send Template Message

The system SHALL send a pre-approved template via Meta Cloud API and persist an outbound record with `messageType=TEMPLATE` and `templateName`. Default language is `es`.

#### Scenario: Send appointment confirmation template

- GIVEN appointment data and recipient
- WHEN sendTemplate(phoneNumber, "appointment_confirmation")
- THEN template sent, outbound record persisted with templateName

### Requirement: Send Interactive List

The system SHALL send an interactive list picker via Meta Cloud API and persist an outbound record with `messageType=INTERACTIVE`.

#### Scenario: Send list picker for appointment selection

- GIVEN patient with 2 appointments, sections with rows
- WHEN sendInteractiveList(phoneNumber, header, body, button, sections)
- THEN interactive message sent, outbound record persisted

### Requirement: Mark As Read

The system SHALL forward a `markMessageAsRead` call to the Meta Cloud API.

#### Scenario: Mark message read

- GIVEN valid messageId from inbound message
- WHEN markAsRead(messageId)
- THEN Meta API mark-as-read called, response returned

### Requirement: Patient Lookup By Phone

The system SHALL find a patient by phone number. If none exists, auto-create with phone as placeholder name using `DENTIST_USER_ID`. MUST throw if `DENTIST_USER_ID` is not configured.

#### Scenario: Find existing patient

- GIVEN patient with phone "+549..." exists
- WHEN getPatientByPhone("+549...")
- THEN returns existing Patient record

#### Scenario: Auto-create new patient

- GIVEN no patient with phone "+549..." exists, `DENTIST_USER_ID` set
- WHEN getPatientByPhone("+549...")
- THEN creates patient with `name="+549..."`, returns Patient record
