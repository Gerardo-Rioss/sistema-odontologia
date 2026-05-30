# Calendar Sync Specification

## Purpose
Bidirectional sync: Appointment mutations → Google Calendar events (outbound), and Google changes → local DB (inbound via webhook). Fire-and-forget async execution with LWW conflict resolution.

## Requirements

| # | Requirement | Summary |
|---|------------|---------|
| R1 | Outbound Create | MUST create Google event asynchronously on appointment create; store `googleEventId` on success |
| R2 | Outbound Update | MUST patch Google event on appointment update when `googleEventId` exists |
| R3 | Outbound Delete | MUST delete Google event on appointment delete when `googleEventId` exists |
| R4 | Inbound Reconciliation | SHALL reconcile webhook changes via LWW: compare `updatedAt` timestamps; most recent wins |
| R5 | Fire-and-Forget | Sync failure MUST NOT block API response; appointment CRUD returns immediately |
| R6 | Retry | SHOULD retry failed sync with exponential backoff (max 3 attempts) |
| R7 | Health Check | MUST expose `GET /api/calendar/sync` returning connection status, lastSyncAt, pending retries |

### Scenarios

#### Scenario: Create appointment → Google event
- GIVEN CalendarConnection ACTIVE, appointment created with patient/date/time
- WHEN `AppointmentService.create()` commits
- THEN `CalendarService` creates Google event async, stores `googleEventId` on appointment

#### Scenario: Update appointment → Google event updated
- GIVEN appointment has `googleEventId="evt-abc"`
- WHEN appointment date/time changed via PUT
- THEN Google event "evt-abc" patched with new values; appointment unchanged on Google failure

#### Scenario: Delete appointment → Google event removed
- GIVEN appointment `googleEventId="evt-abc"`
- WHEN appointment deleted
- THEN Google event "evt-abc" deleted async

#### Scenario: Google event newer → local updated (LWW inbound)
- GIVEN local appointment `googleEventId="evt-abc"`, `updatedAt=T1`; Google event `updated=T2` where T2 > T1
- WHEN webhook triggers reconciliation
- THEN local appointment fields updated from Google; `updatedAt` set to T2

#### Scenario: Local appointment newer → Google wins ignored (LWW)
- GIVEN local `updatedAt=T2`, Google event `updated=T1` where T1 < T2
- WHEN webhook fires for same event
- THEN local appointment unchanged

#### Scenario: Google event deleted externally → local cancelled
- GIVEN appointment `googleEventId="evt-abc"`, status=CONFIRMED
- WHEN webhook reports event deleted
- THEN local status set to CANCELLED

#### Scenario: No calendar connected → create succeeds silently
- GIVEN no ACTIVE CalendarConnection
- WHEN appointment created
- THEN 201 returned, `googleEventId` stays null, no sync attempted

#### Scenario: Google API down → appointment still created
- GIVEN Google Calendar API unreachable
- WHEN appointment created
- THEN 201 returned immediately, sync failure logged, retry queued

#### Scenario: Health check
- GIVEN CalendarConnection ACTIVE, last sync 5 min ago
- WHEN `GET /api/calendar/sync`
- THEN 200 `{status:"connected", googleEmail:"...", lastSyncAt:"...", pendingRetries:0}`
