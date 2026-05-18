# Tasks: Google Calendar Bidirectional Sync (Fase 4)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~780–850 (15 files, 11 new + 6 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked-to-main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema, encryption, types, token repository | PR 1 (~150 loc) | Base: main; includes encryption unit test |
| 2 | CalendarService core implementation | PR 2 (~250 loc) | Base: main after PR 1 merged; includes mocked unit tests |
| 3 | API routes, appointment hooks, settings UI | PR 3 (~280 loc) | Base: main after PR 2 merged; includes integration tests |

## Phase 1: Schema & Foundation

- [x] 1.1 Install `googleapis` and `google-auth-library` in `package.json`; add `GOOGLE_REDIRECT_URI` to `.env.example`
- [x] 1.2 Add `CalendarConnection` model to `prisma/schema.prisma` (fields per design); add `googleEventId String? @unique` and `googleCalendarId` to `Appointment`
- [x] 1.3 Run `prisma generate`; create manual migration `20260518180000_add_calendar_integration` (DB not available)
- [x] 1.4 Create `src/lib/encryption.ts` — `encrypt(plaintext)` / `decrypt(ciphertext)` using AES-256-GCM via Node `crypto`; key derived from `NEXTAUTH_SECRET` via SHA-256
- [x] 1.5 Add `CalendarConnection`, `OAuthTokenResponse`, `GoogleCalendarEvent`, `SyncResult` types to `src/types/calendar.ts`
- [x] 1.6 Create `src/repositories/calendar.repository.ts` — `findByUserId`, `upsertTokens`, `delete`, `updateLastSyncedAt`, `updateStatus` via Prisma with transparent encrypt/decrypt

## Phase 2: Calendar Service Core

- [x] 2.1 Rewrite `src/services/calendar.service.ts`: singleton `OAuth2Client` factory with refresh callback; `getAuthClient(userId)` decrypting tokens + auto-refresh
- [x] 2.2 Implement `createGoogleEvent(appointment)` — maps to `google.calendar({v:'v3'}).events.insert`; stores `googleEventId` back to DB
- [x] 2.3 Implement `updateGoogleEvent(id, changes)` — `events.update` + `deleteFromCalendar` with 410 handling; all catch errors gracefully
- [x] 2.4 Implement `reconcileWebhookEvent(googleEvent, userId)` — LWW: compare `updatedAt` → resolve (Google newer → pull; local newer → push back)
- [x] 2.5 Implement `syncToCalendar(appointmentId, userId)` dispatcher: create/update/re-create-on-410 based on appointment state and `googleEventId`
- [x] 2.6 Implement `catchUpSync(userId)` — scheduled fallback: list Google events since `lastSyncedAt`, reconcile each, push local-only appointments

## Phase 3: API Routes & Wiring

- [ ] 3.1 Create `src/app/api/calendar/auth/route.ts` — GET generates Google OAuth URL with `calendar.readonly` + `calendar.events` scopes, redirects
- [ ] 3.2 Create `src/app/api/calendar/auth/callback/route.ts` — GET exchanges `code` for tokens via `OAuth2Client`, encrypts refresh token, upserts `CalendarToken`, redirects to `/dashboard/settings?calendar=connected`
- [ ] 3.3 Create `src/app/api/calendar/disconnect/route.ts` — POST verifies auth, deletes `CalendarToken`, revokes Google token, returns 200
- [ ] 3.4 Create `src/app/api/calendar/status/route.ts` — GET returns `{ connected, calendarEmail, lastSyncedAt }`
- [ ] 3.5 Update `src/app/api/calendar/sync/route.ts` — POST triggers manual sync; GET returns health status with connected/lastSync info
- [ ] 3.6 Create `src/app/api/calendar/webhook/route.ts` — POST validates `X-Goog-Channel-Token` header, dispatches by `X-Goog-Resource-State` (sync/exists/not_exists), calls `processExternalChange`
- [ ] 3.7 Modify `src/services/appointment.service.ts` — add fire-and-forget `calendarService.syncToGoogle()` calls (`.catch(log)`) after `schedule`, `reschedule`, `confirm`, `cancel`, `delete`

## Phase 4: Settings UI

- [ ] 4.1 Modify `src/app/(dashboard)/dashboard/settings/page.tsx` — add "Conectar Google Calendar" button (redirects to `/api/calendar/auth`), disconnect button, and connected status indicator (green dot + email)

## Phase 5: Testing

- [x] 5.1 Unit: `encryption.ts` round-trip encrypt/decrypt (Jest)
- [ ] 5.2 Unit: `CalendarService.createGoogleEvent` — mock `googleapis`, verify event body shape
- [ ] 5.3 Unit: `CalendarService.processExternalChange` — mock Google API, verify LWW resolves Google-newer-wins + local-newer-wins
- [ ] 5.4 Integration: OAuth callback → token saved in DB (mock token endpoint with nock)
- [ ] 5.5 Integration: Appointment mutations → `syncToGoogle()` called after schedule/reschedule/cancel/delete/confirm
- [ ] 5.6 E2E: Webhook POST → `processExternalChange` → appointment updated in DB
