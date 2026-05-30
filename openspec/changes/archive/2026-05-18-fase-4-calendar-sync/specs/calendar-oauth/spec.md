# Calendar OAuth Specification

## Purpose
OAuth2 authorization for dentist to grant Google Calendar access. Token exchange, encrypted storage, refresh lifecycle, and connect/disconnect.

## Requirements

| # | Requirement | Summary |
|---|------------|---------|
| R1 | OAuth2 Authorization Flow | MUST implement Google OAuth2 code flow with `calendar.readonly` + `calendar.events` scopes |
| R2 | Token Exchange & Storage | SHALL exchange auth code for access+refresh tokens; store encrypted in CalendarConnection |
| R3 | Token Refresh | MUST auto-refresh expired access tokens via Google OAuth2 endpoint |
| R4 | Disconnect | MUST allow dentist to revoke access (delete tokens + notify Google revoke endpoint) |
| R5 | Connection Status UI | Settings SHALL show connected/disconnected state with Google email |

### Scenarios

#### Scenario: OAuth happy path
- GIVEN authenticated dentist on Settings page
- WHEN dentist clicks "Conectar Google Calendar"
- THEN redirects to Google consent; on approval, callback exchanges code → stores encrypted tokens → redirects to Settings with `connected=true` + Google email shown

#### Scenario: User denies consent
- GIVEN dentist on Google consent screen
- WHEN dentist clicks "Cancel"
- THEN callback receives `error=access_denied`, Settings displays "Conexión rechazada"

#### Scenario: Token auto-refresh
- GIVEN CalendarConnection with expired accessToken, valid refreshToken
- WHEN Google returns 401 on calendar API call
- THEN system refreshes token, updates stored accessToken + tokenExpiry, retries original call

#### Scenario: Refresh token revoked
- GIVEN refreshToken revoked in Google Account
- WHEN refresh attempt fails with `invalid_grant`
- THEN CalendarConnection status set to `EXPIRED`, Settings shows "Reconectar Google Calendar"

#### Scenario: Disconnect
- GIVEN CalendarConnection status=ACTIVE
- WHEN dentist clicks "Desconectar Google Calendar"
- THEN tokens deleted from DB, Google revoke endpoint called, Settings shows "Desconectado"

#### Scenario: Connection status — connected
- GIVEN CalendarConnection ACTIVE for session user with googleEmail="dr@clinic.com"
- WHEN Settings loads
- THEN shows "Conectado como dr@clinic.com" with green indicator

#### Scenario: Connection status — disconnected
- GIVEN no ACTIVE CalendarConnection
- WHEN Settings loads
- THEN shows "No conectado" with connect button
