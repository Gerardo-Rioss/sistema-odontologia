# Design: Google Calendar Bidirectional Sync

## Technical Approach

Fire-and-forget hooks in `AppointmentService` call `CalendarService` post-mutation. Google OAuth2 tokens stored encrypted in DB (AES-256-GCM). Google Calendar push notifications (webhook) reconcile external changes via last-write-wins on `updatedAt`. Singleton Google API client with automatic token refresh. One calendar per dentist (`userId`).

## Architecture Decisions

| # | Decision | Options | Chosen | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Token storage | DB (AES-256-GCM) vs httpOnly cookie | **DB encrypted** | Refresh tokens exceed cookie limits; DB survives server restarts; per-user isolation; proposal already scopes `CalendarConnection` in schema |
| D2 | Sync trigger | Fire-and-forget vs synchronous | **Fire-and-forget** | Already decided in proposal. Google failures must not block appointment API. Compensate with health check + manual sync |
| D3 | External change detection | Webhooks + daily polling vs polling-only | **Webhooks + daily fallback** | Near-real-time with minimal API usage. Webhook missed → daily incremental catch-up sync via `lastSyncedAt` |
| D4 | Conflict resolution | LWW vs manual review | **Last-write-wins** | Already decided in proposal. Compare `updatedAt` timestamps. Simple and predictable for single-dentist scenario |
| D5 | Google API client | Singleton + auto-refresh vs per-request | **Singleton with refresh callback** | `googleapis` `OAuth2Client` has built-in refresh; store tokens callback auto-updates DB on refresh |
| D6 | Calendar scope | 1 per dentist vs multiple | **Primary calendar per dentist** | Single-dentist clinics. User's Google primary calendar. `calendarId` stored in `CalendarToken` for flexibility |

## Data Flow

```
AppointmentService.mutate()
  ├─→ AppointmentRepository (DB commit)
  └─→ CalendarService.syncToGoogle(apptId)  [fire-and-forget, .catch(log)]
       ├─→ getAuthClient(userId)
       │    ├─→ decrypt tokens from CalendarToken
       │    ├─→ OAuth2Client (auto-refreshes on 401)
       │    └─→ re-encrypt & save if refreshed
       └─→ google.calendar({v:'v3'}).events.insert/update/delete

Google Calendar change (external)
  → POST /api/calendar/webhook  [X-Goog-Channel-Id, X-Goog-Resource-Id]
     └─→ CalendarService.processExternalChange()
          ├─→ fetch event from Google
          ├─→ compare updatedAt: Google vs local Appointment
          ├─→ if Google newer → update Appointment in DB
          └─→ if local newer → overwrite Google (push back)

OAuth flow:
  Settings Page → GET /api/calendar/auth → Google OAuth consent
  → GET /api/calendar/auth/callback?code=xxx
     ├─→ exchange code for tokens
     ├─→ encrypt refresh_token (AES-256-GCM)
     ├─→ upsert CalendarToken (userId, accessToken, refreshToken, expiresAt)
     └─→ redirect to /dashboard/settings?calendar=connected

Health check:
  GET /api/calendar/sync → return { connected, lastSyncedAt, calendarEmail }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `CalendarToken` model + `googleEventId` field on `Appointment` |
| `src/lib/encryption.ts` | Create | AES-256-GCM encrypt/decrypt helpers for refresh tokens |
| `src/types/index.ts` | Modify | Add `CalendarToken`, `SyncResult`, `CalendarStatus` types |
| `src/repositories/calendar-token.repository.ts` | Create | CRUD for CalendarToken (save, findByUser, upsert, delete) |
| `src/services/calendar.service.ts` | Modify | Full implementation: OAuth client, create/update/delete events, webhook handler, sync |
| `src/services/appointment.service.ts` | Modify | Add fire-and-forget `calendarService.syncToGoogle()` calls after each mutation |
| `src/app/api/calendar/auth/route.ts` | Create | GET: redirect to Google OAuth consent screen |
| `src/app/api/calendar/auth/callback/route.ts` | Create | GET: exchange code, save encrypted tokens, redirect |
| `src/app/api/calendar/disconnect/route.ts` | Create | POST: delete CalendarToken, stop webhook channel |
| `src/app/api/calendar/status/route.ts` | Create | GET: return { connected, lastSyncedAt, calendarEmail } |
| `src/app/api/calendar/sync/route.ts` | Modify | POST trigger sync; GET return health status |
| `src/app/api/calendar/webhook/route.ts` | Create | POST: receive Google push notifications, call processExternalChange |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Modify | Add OAuth connect/disconnect button + status indicator |
| `package.json` | Modify | Add `googleapis` + `google-auth-library` dependencies |
| `.env.example` | Modify | Add `GOOGLE_ENCRYPTION_KEY` |

## Database Schema

```prisma
model CalendarToken {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String
  refreshToken String   // AES-256-GCM encrypted
  expiresAt    DateTime
  calendarId   String?  // Google calendar ID (null = primary)
  calendarEmail String?
  connected    Boolean  @default(true)
  lastSyncedAt DateTime?
  channelId    String?  // Google webhook channel
  resourceId   String?  // Google webhook resource
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("calendar_tokens")
}

// Add to Appointment:
model Appointment {
  // ... existing fields ...
  googleEventId String?  @unique
}
```

## Error Handling Matrix

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Google API down (5xx) | Log error, appointment mutation succeeds | Retry on next mutation or manual sync |
| Rate limited (429) | Exponential backoff (1s→2s→4s), log | Google quota resets per 100s |
| Token expired | OAuth2Client auto-refreshes using refresh_token | If refresh fails → mark `connected=false` |
| Refresh token revoked | Mark `connected=false`, log warning | User re-authorizes via Settings |
| Webhook missed | No immediate update | Daily catch-up sync: GET events updated since `lastSyncedAt` |
| Encryption key missing at startup | `CalendarService` methods throw configuration error | Server won't start without `GOOGLE_ENCRYPTION_KEY` in env |
| Duplicate event (re-authorize) | Upsert by `userId` prevents duplicate CalendarTokens | OAuth callback always upserts |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `encryption.ts` encrypt/decrypt | Jest, test round-trip AES-256-GCM |
| Unit | `CalendarService.createGoogleEvent` | Mock `googleapis`, verify event body shape |
| Unit | `CalendarService.processExternalChange` | Mock Google API responses, verify LWW logic |
| Integration | OAuth callback → token saved | Mock Google token endpoint (nock), call callback route, assert DB state |
| Integration | Appointment mutation → calendar sync fired | Mock CalendarService, verify `syncToGoogle()` called after schedule/reschedule/cancel/delete |
| E2E | Webhook → appointment updated | Mock Google push, call webhook endpoint, assert Appointment in DB |
