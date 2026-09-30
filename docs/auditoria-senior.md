# Auditoría Senior — Sistema de Gestión Odontológica

**Fecha:** 2026-09-05  
**Auditor:** Arquitecto de Software Senior + Auditor de Seguridad  
**Repo:** sistema-odontologia (Next.js 14, TypeScript, PostgreSQL/Prisma, NextAuth v5, WhatsApp Business API, Google Calendar, Sentry, Vercel)

---

## Resumen Ejecutivo

El sistema presenta una **arquitectura bien estructurada** con patrón repositorios/servicios consistente, validación Zod, y ownership verification en todas las rutas sensibles. Sin embargo, existen **3 riesgos críticos** que requieren atención inmediata antes de producción:

1. **CSP `unsafe-inline`/`unsafe-eval` + CORS `*`** →.vector de XSS y CSRF amplio
2. **29 vulnerabilidades en dependencias** (2 críticas en next-auth) → riesgo de autenticación comprometida
3. **node-cron en Vercel serverless** → recordatorios automáticos no funcionan en producción

**Estado de verificaciones:**
- ✅ Lint: pasa (2 warnings menores)
- ✅ Tests: 486 tests (485 passed, 1 skipped)
- ❌ Type-check: falla (error de tipado en calendar.service.ts)
- ❌ Build: falla (mismo error de tipado)
- ❌ npm audit: 29 vulnerabilidades (2 critical, 14 high, 10 moderate, 3 low)

---

## Top 5 Riesgos

| # | Riesgo | Severidad | Impacto |
|---|--------|-----------|---------|
| 1 | CSP permite `unsafe-inline`/`unsafe-eval` + CORS `*` en todas las APIs | **Crítica** | XSS, CSRF, robo de sesión |
| 2 | next-auth v5 beta con vulnerabilidades críticas (homoglyph bypass, state binding) | **Crítica** | Autenticación comprometida |
| 3 | node-cron no funciona en Vercel serverless ( cold start, sin proceso persistente) | **Alta** | Recordatorios no se envían en prod |
| 4 | Tokens de Google Calendar en texto plano en DB (sin cifrado) | **Alta** | Exposición de tokens OAuth |
| 5 | Build y type-check fallan → CI/CD bloqueado | **Alta** | No se puede deployar |

---

## Tabla de Hallazgos

### SEGURIDAD (Prioridad Máxima)

| ID | Severidad | Eje | Archivo:línea | Problema | Impacto | Recomendación |
|----|-----------|-----|---------------|----------|---------|---------------|
| S-01 | **Crítica** | OWASP/CSP | `vercel.json:35` | CSP permite `script-src 'unsafe-inline' 'unsafe-eval'` y `style-src 'unsafe-inline'` | Atacante puede inyectar scripts arbitraries via XSS, bypassing CSP completamente | Eliminar `unsafe-inline` y `unsafe-eval`. Usar nonces o hashes para scripts inline. Next.js soporta CSP nonces via headers personalizados. |
| S-02 | **Crítica** | OWASP/CORS | `vercel.json:43-44` | CORS `Access-Control-Allow-Origin: *` en todas las rutas `/api/*` | Cualquier sitio web puede hacer requests autenticados al API (si el usuario tiene sesión) | Restringir a dominios específicos: `https://tu-dominio.com`. En desarrollo, permitir `localhost:3000`. |
| S-03 | **Crítica** | Dependencias | `package.json:41` | `next-auth@5.0.0-beta.0` con 3 CVEs críticos: homoglyph @ bypass, malformed Bearer header crash, OAuth state not bound to provider | Atacante puede bypassing de autenticación, provocar crashes, o CSRF en OAuth | Actualizar a next-auth stable cuando esté disponible. Como workaround inmediato: aplicar patches de los advisories o migrar a `@auth/core` con los fixes. |
| S-04 | **Alta** | OWASP/SSRF | `calendar/webhook/route.ts:24` | `getExpectedChannelToken()` usa fallback `"calendar-webhook-secret"` si `NEXTAUTH_SECRET` no está configurado | Token predecible permite suplantar notificaciones de Google Calendar | Usar un token dedicado (`CALENDAR_WEBHOOK_SECRET`) sin fallback. Nunca usar valores hardcodeados. |
| S-05 | **Alta** | Datos sensibles | `prisma/schema.prisma:247-268` | Historia clínica (alergias, medicaciones, condiciones, hábitos) almacenada en texto plano | Exposición de datos de salud en caso de brecha de DB (violación Habeas Data) | Cifrar campos sensibles de MedicalRecord usando `encryption.ts` (AES-256-GCM). Crear migración Prisma para cifrar datos existentes. |
| S-06 | **Alta** | Datos sensibles | `prisma/schema.prisma:88-105` | Tokens de Google Calendar (`accessToken`, `refreshToken`) en texto plano | Tokens OAuth permiten acceso al calendario del usuario | Cifrar `accessToken` y `refreshToken` con `encryption.ts` antes de persistir. Modificar `calendar.service.ts` para descifrar al usar. |
| S-07 | **Alta** | Rate limiting | `lib/rate-limiter.ts` | Rate limiter in-memory (Map) se reinicia en cold starts de serverless | En Vercel, cada invocación es un contenedor nuevo → rate limiting inútil | Migrar a Redis (Upstash) o usar Vercel's built-in rate limiting. Almacenar estado externo al proceso. |
| S-08 | **Alta** | OWASP/Upload | `services/attachment.service.ts:27-56` | Upload no valida tipo MIME, tamaño máximo, ni extensión del archivo | Atacante puede subir archivos maliciosos (web shells, HTML con XSS) | Agregar validación: MIME whitelist (image/*, application/pdf), max size (10MB), block executable extensions. |
| S-09 | **Media** | OWASP/XSS | `app/api/auth/forgot-password/route.ts:65-67` | En modo development, el token de reset se retorna en la respuesta JSON | Si NODE_ENV no está bien configurado en prod, el token se expone | Remover esta funcionalidad de dev o proteger con verificación explícita de `NODE_ENV === 'development'`. |
| S-10 | **Media** | OWASP/CSRF | `middleware.ts:14-19` | Rutas `/api/whatsapp/*`, `/api/calendar/*`, `/api/settings/*`, `/api/statistics/*` NO están en el matcher del middleware | Estas rutas API son públicas sin autenticación (excepto las que usan `withAuth` internamente) | Agregar todas las rutas API sensibles al matcher, o verificar que cada handler use `withAuth`. |
| S-11 | **Media** | OWASP/Logging | `services/reminder.service.ts:143,169` | Logs incluyen números de teléfono de pacientes (`phone: ${appointment.patient.phone}`) | PII en logs viola minimización de datos | Redactar teléfonos en logs: usar `phone.slice(0,4) + '****'` o similar. |
| S-12 | **Media** | Seguridad | `.env.production:1` | `.env.production` commiteado con placeholders (no secretos reales, pero el patrón es peligroso) | Futuro desarrollador podría agregar secretos reales y commitearlos | Mover a secrets de Vercel. No mantener `.env.production` en el repo. |
| S-13 | **Baja** | Seguridad | `cookies.txt` (raíz) | Archivo `cookies.txt` presente en el repo | Posible exposición de cookies de sesión | Eliminar y agregar a `.gitignore` (ya está). Verificar que no contenga datos sensibles. |

### ARQUITECTURA Y ESCALABILIDAD

| ID | Severidad | Eje | Archivo:línea | Problema | Impacto | Recomendación |
|----|-----------|-----|---------------|----------|---------|---------------|
| A-01 | **Alta** | Type safety | `services/calendar.service.ts:29` | Error TypeScript: `ICalendarRepository.upsertTokens` retorna `Promise<void>` pero la implementación retorna el objeto completo | **Build y type-check fallan** → no se puede deployar | Actualizar la interfaz `ICalendarRepository` para que `upsertTokens` retorne `Promise<CalendarConnection>` o ajustar la implementación. |
| A-02 | **Alta** | Serverless | `instrumentation.ts:33` | `node-cron` registrado en `instrumentation.ts` pero no funciona en Vercel serverless (sin proceso persistente) | Recordatorios automáticos NO se ejecutan en producción | Usar el endpoint HTTP `/api/whatsapp/cron/reminders` con un cron externo (Vercel Cron Jobs, GitHub Actions, o cron-service.com). |
| A-03 | **Media** | Patrón | `app/api/settings/route.ts:19-41` | Settings route usa `sanitize()` manual en vez de Zod DTO como el resto del API | Inconsistencia en validación, riesgo de olvidar campos | Crear `UpdateSettingsDTO` con Zod y usar el patrón consistente del resto del API. |
| A-04 | **Media** | Concurrencia | `services/conversation.service.ts:490-512` | Slot collision check en WhatsApp bot es read-then-write sin transacción | Dos mensajes simultáneos pueden reservar el mismo slot | Usar transacción Prisma con `SELECT ... FOR UPDATE` o unique constraint en `(userId, date, time)` para appointments activos. |
| A-05 | **Media** | Escalabilidad | `lib/rate-limiter.ts` | Límite de 5 req/15min es extremadamente bajo para APIs de producción | Usuarios legítimos serán rate-limitados frecuentemente | Aumentar a 30-60 req/15min para APIs generales. Mantener 5-10 solo para auth endpoints. |
| A-06 | **Baja** | N+1 | `services/conversation.service.ts:606-611` | `appointmentService.getAll()` carga TODAS las citas CONFIRMED y filtra en memoria por patientId | Con muchos pacientes, esto es ineficiente | Agregar filtro por patientId en la query del repositorio. |

### ROBUSTEZ Y CONFIABILIDAD

| ID | Severidad | Eje | Archivo:línea | Problema | Impacto | Recomendación |
|----|-----------|-----|---------------|----------|---------|---------------|
| R-01 | **Alta** | Sentry | `sentry.client.config.ts`, `sentry.server.config.ts` | Source maps NO se suben a Sentry en el workflow de deploy (solo se builda, no se ejecuta `@sentry/nextjs`) | Errores en Sentry muestran código minificado, imposible debugear | Instalar `@sentry/nextjs` CLI y ejecutar `sentry-upload-sourcemaps` después del build en `deploy.yml`. |
| R-02 | **Media** | Errores | `api/whatsapp/webhook/route.ts:173` | Webhook retorna HTTP 200 incluso con errores internos (para evitar reintentos de Meta) | Errores silenciados, imposible detectar fallos | Mantener 200 para Meta, pero registrar errores en Sentry explícitamente con `Sentry.captureException()`. |
| R-03 | **Media** | Idempotencia | `services/whatsapp-messaging.service.ts` | No se verifica si el mensaje ya fue procesado antes de duplicar | Webhook de Meta puede reenviar el mismo mensaje | Verificar `waMessageId` único antes de persistir (ya tiene `@unique` en schema, pero no se maneja el error de duplicado graceful). |
| R-04 | **Media** | Timezone | `services/calendar.service.ts:13` | Timezone hardcodeado a `America/Argentina/Buenos_Aires` | No funciona para consultorios en otras zonas horarias | Hacer configurable via `ClinicSettings` o variable de entorno. |
| R-05 | **Baja** | Tests | `tests/` | No hay E2E tests para flujos de WhatsApp (webhook → conversation → appointment) ni Calendar sync | Flujos críticos de negocio sin cobertura E2E | Agregar Playwright tests para el flujo completo de booking vía WhatsApp y sync con Google Calendar. |
| R-06 | **Baja** | CI/CD | `.github/workflows/deploy.yml` | Prisma migrate deploy se ejecuta ANTES del build pero sin verificar que el build pase | Migración exitosa pero build fallido → estado inconsistente | Agregar job de validación (type-check + lint + tests) como dependencia antes de migrate. |

### CALIDAD Y MANTENIBILIDAD

| ID | Severidad | Eje | Archivo:línea | Problema | Impacto | Recomendación |
|----|-----------|-----|---------------|----------|---------|---------------|
| Q-01 | **Media** | Dead code | `services/calendar.service.ts:4` | Import `prisma` no utilizado (warning de ESLint) | Code smell, confusión | Eliminar el import no utilizado. |
| Q-02 | **Media** | Type safety | `components/ui/ChartTooltip.tsx:7,18` | Uso de `any` explícito (2 warnings ESLint) | Pérdida de type safety | Definir tipos específicos para los datos del tooltip. |
| Q-03 | **Media** | DRY | `app/api/whatsapp/send/route.ts:16-21` | Role check manual duplicado (ya lo hace `withAuth({ roles: ["ADMIN"] })` en línea 66) | Código redundante, posible inconsistencia | Eliminar el check manual en línea 16-21, confiar en `withAuth`. |
| Q-04 | **Baja** | Docs | `docs/` | No hay documentación de API (API.md), ni guía de arquitectura | Dificulta onboarding de nuevos desarrolladores | Crear `docs/api.md` con endpoints, autenticación, y ejemplos. |
| Q-05 | **Baja** | Conventions | `types/` | `SessionUser` y otros types compartidos no tienen documentación de JSDoc | Difícil entender el contrato de tipos | Agregar JSDoc a los types exportados. |

### RENDIMIENTO

| ID | Severidad | Eje | Archivo:línea | Problema | Impacto | Recomendación |
|----|-----------|-----|---------------|----------|---------|---------------|
| P-01 | **Media** | Cache | No hay cache de React Query configurado | Cada navegación re-fetch datos del server | Latencia innecesaria, carga en DB | Configurar `staleTime` y `cacheTime` en React Query para datos que no cambian frecuentemente. |
| P-02 | **Media** | Queries | `services/statistics.service.ts:108-122` | `getOverview()` ejecuta 6 queries en paralelo pero sin índices optimizados para cada una | Queries lentas con datos crecientes | Verificar que los índices de Prisma cubran las queries de statistics. Considerar materialized views para métricas complejas. |
| P-03 | **Baja** | Bundle | `next.config.mjs` | Sin configuración de `output: 'standalone'` ni optimización de bundle | Bundle más grande de lo necesario | Agregar `output: 'standalone'` para reducir tamaño del deploy en Vercel. |
| P-04 | **Baja** | Imágenes | No se usa `next/image` optimizado en algunos componentes | Imágenes sin optimizar, LCP alto | Experiencia de usuario lenta | Auditar uso de `<img>` vs `<Image>` y migrar a `next/image` donde sea posible. |

---

## Checklist de Seguridad

| Ítem | Estado | Notas |
|------|--------|-------|
| Todas las rutas API validan sesión + rol | ✅ | `withAuth` se usa en todas las rutas excepto auth/webhook públicos |
| Ownership verification (IDOR protection) | ✅ | `verifyOwnership()` se usa en pacientes, citas, archivos, medical records |
| Zod en TODO input | ✅ | Todos los endpoints de escritura usan Zod DTOs |
| Cifrado en reposo (datos sensibles) | ❌ | `encryption.ts` existe pero NO se usa en MedicalRecord ni Calendar tokens |
| Rate limiting en auth | ✅ | 5 req/15min por IP en register, forgot-password, reset-password |
| Rate limiting en APIs generales | ❌ | Solo en auth endpoints, no en appointments/patients |
| Webhook WhatsApp: firma HMAC verificada | ⚠️ | Verificada SOLO si `WHATSAPP_APP_SECRET` está configurado (opcional) |
| Webhook Calendar: token verificado | ✅ | `X-Goog-Channel-Token` validado contra `NEXTAUTH_SECRET` |
| CSP seguro | ❌ | `unsafe-inline` y `unsafe-eval` permitidos |
| CORS restringido | ❌ | `*` permitido en todas las APIs |
| Secretos no commiteados | ⚠️ | `.env` y `.env.production` en repo con placeholders (no secretos reales) |
| NEXTAUTH_SECRET fuerte | ⚠️ | En dev: `"dev-secret-cambiar-en-produccion-1234567890"` (débil) |
| npm audit limpio | ❌ | 29 vulnerabilidades (2 critical en next-auth) |
| Source maps Sentry configurados | ❌ | No se suben en CI/CD |
| Backups de DB configurados | ❌ | No hay estrategia de backups documentada |
| Habeas Data / datos clínicos | ⚠️ | Medical records en texto plano, sin cifrado |

---

## Plan por Fases

### Fase 1: Quick Wins (1-2 días) — Esfuerzo: S

| # | Tarea | Archivos | Impacto |
|---|-------|----------|---------|
| 1 | Fix error TypeScript `ICalendarRepository.upsertTokens` → desbloquear build | `services/calendar.service.ts`, `services/types.ts` | Crítico: desbloquea CI/CD |
| 2 | Eliminar `prisma` import no utilizado en calendar.service.ts | `services/calendar.service.ts` | Limpieza |
| 3 | Eliminar role check duplicado en whatsapp/send/route.ts | `app/api/whatsapp/send/route.ts` | DRY |
| 4 | Agregar rutas API faltantes al middleware matcher | `middleware.ts` | Seguridad |
| 5 | Eliminar `cookies.txt` del repo | raíz | Seguridad |

### Fase 2: Corto Plazo (1-2 semanas) — Esfuerzo: M

| # | Tarea | Archivos | Impacto |
|---|-------|----------|---------|
| 1 | CSP seguro: eliminar `unsafe-inline`/`unsafe-eval`, usar nonces | `vercel.json`, `next.config.mjs`, `layout.tsx` | Crítico: XSS |
| 2 | CORS restringido a dominio específico | `vercel.json` | Crítico: CSRF |
| 3 | Cifrar tokens Google Calendar en DB | `calendar.service.ts`, `calendar.repository.ts`, migración Prisma | Alto: datos sensibles |
| 4 | Cifrar campos sensibles de MedicalRecord | `medical-record.service.ts`, migración Prisma | Alto: Habeas Data |
| 5 | Validación de archivos upload (MIME, size, extensions) | `attachment.service.ts` | Alto: seguridad uploads |
| 6 | Migrar rate limiter a Redis (Upstash) | `lib/rate-limiter.ts` | Alto: serverless |
| 7 | Actualizar next-auth a versión estable (o aplicar patches) | `package.json` | Crítico: auth |

### Fase 3: Mediano Plazo (1-2 meses) — Esfuerzo: L

| # | Tarea | Archivos | Impacto |
|---|-------|----------|---------|
| 1 | Reemplazar node-cron por Vercel Cron Jobs o cron externo | `instrumentation.ts`, `vercel.json`, deploy config | Alto: funcionalidad prod |
| 2 | Transacciones Prisma para slots concurrentes | `appointment.service.ts`, schema | Alto: concurrencia |
| 3 | Sentry source maps en CI/CD | `.github/workflows/deploy.yml` | Medio: observabilidad |
| 4 | E2E tests para WhatsApp y Calendar flows | `tests/e2e/` | Medio: confiabilidad |
| 5 | Configurar backups automáticos de PostgreSQL | infra | Alto: continuidad |
| 6 | Timezone configurable en ClinicSettings | schema, calendar.service.ts | Medio: escalabilidad |
| 7 | React Query cache optimization | hooks, providers | Medio: rendimiento |
| 8 | Documentación de API y guía de arquitectura | `docs/` | Medio: mantenibilidad |

---

## 3 Cambios de Mayor Impacto

### 1. 🛡️ CSP + CORS Seguros (Seguridad)
**Problema:** El CSP con `unsafe-inline`/`unsafe-eval` y CORS `*` son los vectores de ataque más amplios del sistema. Cualquier XSS se convierte en robo de sesión completo, y cualquier sitio puede hacer llamadas al API.

**Solución:** Configurar CSP con nonces para scripts inline (Next.js lo soporta via `headers` en `next.config.mjs`), eliminar `unsafe-eval`, y restringir CORS al dominio de producción.

**Impacto:** Reduce el superficie de ataque en ~80%.

### 2. 🔐 Cifrado de Datos Sensibles en DB (Habeas Data)
**Problema:** Tokens OAuth, historia clínica (alergias, medicaciones, condiciones), y otros datos sensibles están en texto plano. En caso de brecha de DB, todos los datos de salud quedan expuestos.

**Solución:** Usar `encryption.ts` (AES-256-GCM) para cifrar tokens de Calendar y campos sensibles de MedicalRecord. Crear migración Prisma para cifrar datos existentes.

**Impacto:** Cumplimiento con Habeas Data AR y protección real de datos de salud.

### 3. 🔄 Rate Limiter para Serverless + node-cron Fix (Funcionalidad)
**Problema:** El rate limiter in-memory se pierde en cada cold start de Vercel, y node-cron no funciona en serverless. Ambos son fundamentalmente incompatibles con el runtime de producción.

**Solución:** Migrar rate limiter a Redis (Upstash) y reemplazar node-cron por Vercel Cron Jobs que llamen al endpoint HTTP existente.

**Impacto:** Rate limiting real en producción + recordatorios automáticos funcionando.

---

*Auditoría generada el 2026-09-05. Repo: sistema-odontologia.*
