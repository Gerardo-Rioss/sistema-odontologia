# Proposal: Integración Google Calendar (Fase 4)

## Intent

Sincronizar citas odontológicas bidireccionalmente con Google Calendar. Cada mutación de cita crea/actualiza/elimina su evento en Google, y cambios externos (webhook) reconcilian hacia el sistema.

## Scope

### In Scope
- OAuth2 para autorizar acceso al calendario del dentista (NO como login)
- Motor de sync bidireccional: create/update/delete eventos Google tras mutar Appointment
- Webhook receiver (`/api/calendar/webhook`) para cambios externos
- Conflicto: último-en-escribir-gana (LWW) basado en `updatedAt`
- UI Settings: botón conectar/desconectar + indicador de estado

### Out of Scope
- Google OAuth como login (sistema usa Credentials)
- Otros calendarios (Outlook, iCloud)
- Componente calendario visual (Fase 6)
- Recordatorios (Fase 5)

## Capabilities

### New Capabilities
- `calendar-oauth`: OAuth2 token exchange, refresh, almacenamiento en DB. Endpoint callback.
- `calendar-sync`: Motor con `googleapis`. Hooks fire-and-forget en AppointmentService.
- `calendar-webhook`: Recibe push de Google, reconcilia con `updatedAt` local.

### Modified Capabilities
- `database-schema`: Nuevo `CalendarConnection` (tokens) + `googleEventId` (unique?) en `Appointment`.
- `appointment-crud`: Mutaciones disparan `CalendarService` post-commit. Fallo Google = no bloquea API.

## Approach

1. **Schema**: `CalendarConnection` (tokens) + `googleEventId` en Appointment.
2. **OAuth**: Redirect → Google → callback → guarda tokens.
3. **Sync**: `google.calendar({v:'v3'})`. Mutaciones AppointmentService → CalendarService.
4. **Conflict**: Webhook compara `updatedAt` local vs Google `updated`. Más reciente gana.
5. **Resiliencia**: Fire-and-forget. `GET /api/calendar/sync` reporta token state.

## Affected Areas

| Area | Impact |
|------|--------|
| `prisma/schema.prisma` | +CalendarConnection, +googleEventId |
| `src/types/index.ts` | +SyncResult, +CalendarConnection types |
| `src/services/calendar.service.ts` | Implementar con googleapis |
| `src/services/appointment.service.ts` | Hooks post-mutación |
| `src/app/api/calendar/auth/` | New: redirect + callback |
| `src/app/api/calendar/sync/route.ts` | Implementar POST/GET |
| `src/app/api/calendar/webhook/route.ts` | New: receiver |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Botón OAuth + estado |
| `package.json` | +googleapis, +google-auth-library |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Refresh token expira y sync se rompe silenciosamente | Medium | Health check en GET /api/calendar/sync; UI warning |
| Webhook perdido = inconsistencia | Low | Manual sync endpoint; sync incremental cada 24h |
| Google API rate limits | Low | Operaciones individuales, retry con backoff |

## Rollback

Revertir migration → remover paquetes npm → eliminar rutas `/api/calendar/` → restaurar servicios desde git. Las citas operan normalmente sin Google Calendar.

## Dependencies

- `googleapis`, `google-auth-library` (npm)
- Google Cloud Console: Calendar API habilitada, credenciales OAuth2
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Success Criteria

- [ ] Conectar cuenta Google desde Settings
- [ ] Crear cita → evento Google con datos correctos
- [ ] Modificar/cancelar cita → evento Google actualizado/eliminado
- [ ] Cambio externo en Google → reflejado en sistema vía webhook
- [ ] Token expirado o Google caído → mutaciones de cita NO fallan
- [ ] Tests cubren ciclo: create → Google event → update → delete
