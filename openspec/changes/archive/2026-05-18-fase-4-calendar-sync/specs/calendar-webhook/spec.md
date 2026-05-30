# Calendar Webhook Specification

## Purpose
Receiver for Google Calendar push notifications at `POST /api/calendar/webhook`. Authenticates, verifies `X-Goog-Resource-State`, and triggers incremental reconciliation.

## Requirements

| # | Requirement | Summary |
|---|------------|---------|
| R1 | Push Reception | MUST accept Google push notifications at `POST /api/calendar/webhook` |
| R2 | Authenticity Verification | MUST verify `X-Goog-Channel-Token` matches stored secret per user |
| R3 | Resource State Dispatch | MUST interpret `X-Goog-Resource-State` to trigger correct action (sync/exists/not_exists) |
| R4 | Channel Renewal | SHOULD renew webhook channel before expiration (≤1h remaining) |
| R5 | Fallback | WHEN channel expires, hourly scheduled sync SHALL serve as fallback |

### Resource State Mapping

| State | Action |
|-------|--------|
| `sync` | Acknowledge; full sync recommended |
| `exists` | Incremental sync for changed resource |
| `not_exists` | Treat resource as deleted locally |

### Scenarios

#### Scenario: Valid push triggers sync
- GIVEN registered channel with secret token "s3cret"
- WHEN Google POSTs to `/api/calendar/webhook` with `X-Goog-Channel-Token: s3cret`, `X-Goog-Resource-State: exists`
- THEN 200 returned, incremental sync queued for the calendar

#### Scenario: Invalid token rejected
- GIVEN stored secret "s3cret"
- WHEN Google POSTs with `X-Goog-Channel-Token: wrong`
- THEN 403, no sync triggered

#### Scenario: Resource deleted (not_exists)
- GIVEN `X-Goog-Resource-State: not_exists`, `X-Goog-Resource-Id: evt-abc`
- WHEN webhook received
- THEN local appointment with `googleEventId="evt-abc"` set to CANCELLED

#### Scenario: Initial sync confirmation
- GIVEN `X-Goog-Resource-State: sync`
- WHEN webhook received (new channel setup)
- THEN channelId verified, 200 returned, no data sync needed

#### Scenario: Channel near expiry — renew
- GIVEN channel expires in 30 minutes
- WHEN scheduled renewal check runs
- THEN system calls `google.calendar.events.watch()` to extend, updates `channelExpiry` in DB

#### Scenario: Expired channel — fallback sync
- GIVEN channel expired, no push notifications arriving
- WHEN hourly scheduled sync executes
- THEN incremental sync via `google.calendar.events.list(updatedMin=lastSyncAt)` catches missed changes

#### Scenario: Unauthenticated request
- GIVEN no valid Google signature or missing channel token
- WHEN POST to `/api/calendar/webhook`
- THEN 401
