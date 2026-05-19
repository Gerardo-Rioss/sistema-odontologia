# Guía de Despliegue a Producción

## Checklist Pre-Deploy

Ejecutá estas verificaciones **antes de cada deploy a producción**:

- [ ] `npm run lint` pasa sin errores
- [ ] `npm run type-check` pasa sin errores
- [ ] `npm run build` completa sin errores
- [ ] `npm test` pasa (372 tests o más)
- [ ] `DATABASE_URL` apunta a la base de datos de **producción** (no desarrollo)
- [ ] `NEXTAUTH_SECRET` está configurado con un valor seguro (32+ bytes)
- [ ] `NEXTAUTH_URL` es la URL pública de producción
- [ ] `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están configurados
- [ ] `GOOGLE_REDIRECT_URI` usa la URL de producción
- [ ] `WHATSAPP_TOKEN` es válido y no expirado
- [ ] `CRON_ENABLED=true` para activar recordatorios
- [ ] `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` configurados
- [ ] `SENTRY_ORG` y `SENTRY_PROJECT` configurados
- [ ] Secrets de GitHub Actions configurados:
  - [ ] `DATABASE_URL` (producción)
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
  - [ ] `SENTRY_AUTH_TOKEN`
  - [ ] `SENTRY_ORG`
  - [ ] `SENTRY_PROJECT`

---

## Configuración del Entorno

### 1. Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Vincular proyecto
vercel link

# Descargar variables de entorno de Vercel
vercel env pull .env.vercel

# Hacer deploy de prueba
vercel --prod
```

**Secrets necesarios en GitHub Actions:**
- `VERCEL_TOKEN`: token de acceso personal de Vercel
- `VERCEL_ORG_ID`: ID de la organización en Vercel
- `VERCEL_PROJECT_ID`: ID del proyecto en Vercel

### 2. Base de Datos (Railway)

```bash
# Conectar a Railway CLI
railway link

# Ver variables de entorno
railway variables

# Ejecutar migraciones
railway run npx prisma migrate deploy
```

### 3. Sentry

```bash
# Instalar Sentry CLI (opcional)
npm i -g @sentry/cli

# Iniciar sesión
sentry-cli login

# Crear release
sentry-cli releases new $(git rev-parse --short HEAD)
```

---

## Proceso de Deploy Automático

Cada push a `main` dispara el workflow `deploy.yml` que ejecuta:

1. **Migrate**: `npx prisma migrate deploy` (aplica migraciones pendientes a producción)
2. **Deploy**: `amondnet/vercel-action` despliega a Vercel producción
3. **Sentry Release**: build con source maps + release en Sentry

El deploy solo ocurre en push a `main`. Los PRs ejecutan CI (lint, type-check, build) pero NO despliegan.

---

## Plan de Rollback

### Escenario 1: Deploy fallido (error en build o runtime)

Vercel **revierte automáticamente** al último deploy exitoso. No se requiere acción manual.

### Escenario 2: Migración de base de datos fallida

```bash
# 1. Ver el estado de las migraciones
railway run npx prisma migrate status

# 2. Marcar la migración fallida como rolled back
railway run npx prisma migrate resolve --rolled-back <nombre-migracion>

# 3. Restaurar backup si hay pérdida de datos
railway run pg_restore --clean --dbname="$DATABASE_URL" backups/backup-YYYY-MM-DD-HHmmss.sql.gz
```

### Escenario 3: Rollback manual a commit anterior

```bash
# 1. Identificar el último commit funcional
git log --oneline -5

# 2. Revertir al commit anterior
git revert <commit-problematico> --no-edit
git push origin main

# 3. Vercel redeploya automáticamente desde el nuevo HEAD
```

### Escenario 4: Sentry causa errores en producción

```bash
# Desactivar Sentry temporalmente
# Agregar a variables de entorno en Vercel:
SENTRY_ENABLED=false

# O eliminar SENTRY_DSN para que el SDK no se inicialice
vercel env rm SENTRY_DSN production
vercel env rm NEXT_PUBLIC_SENTRY_DSN production
vercel --prod
```

---

## Backups de Base de Datos

### Estrategia Primaria: Backups Automáticos (Railway)

Railway realiza backups diarios automáticos. **No se requiere acción adicional.**

- Frecuencia: cada 24 horas
- Retención: 7 días
- Restauración: desde el dashboard de Railway > Backups > Restore

### Estrategia Secundaria: Backup Manual

```bash
# Backup manual con pg_dump
DATABASE_URL="postgresql://..." bash scripts/backup.sh

# Subir backup a almacenamiento externo (recomendado)
rclone copy backups/ remote:odontologia-backups/
```

### Restaurar un Backup

```bash
# 1. Descargar el backup
# 2. Restaurar con pg_restore
pg_restore --clean --dbname="$DATABASE_URL" backups/backup-YYYY-MM-DD-HHmmss.sql.gz

# 3. Verificar integridad
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM patients;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM appointments;"
```

---

## Variables de Entorno de Producción

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `DATABASE_URL` | Conexión PostgreSQL producción | Railway / Supabase dashboard |
| `NEXTAUTH_SECRET` | Secreto de sesiones JWT | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL pública de la app | Dominio de Vercel |
| `GOOGLE_CLIENT_ID` | OAuth2 Google Calendar | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Secreto OAuth2 Google | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Callback OAuth2 | `{NEXTAUTH_URL}/api/calendar/auth/callback` |
| `WHATSAPP_TOKEN` | Token de acceso WhatsApp | Meta Business Platform |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp | Meta Business Platform |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación webhook | Valor aleatorio seguro |
| `WHATSAPP_APP_SECRET` | Secreto de firma de webhooks | Meta Business Platform |
| `CRON_SECRET` | Secreto para endpoint cron | `openssl rand -base64 32` |
| `SENTRY_DSN` | DSN de Sentry (server) | Sentry > Settings > SDK |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry (client) | Sentry > Settings > SDK |
| `SENTRY_ORG` | Organización de Sentry | Sentry > Settings |
| `SENTRY_PROJECT` | Proyecto de Sentry | Sentry > Settings |
| `SENTRY_AUTH_TOKEN` | Token de auth para CI | Sentry > Settings > Auth Tokens |

---

## Monitoreo Post-Deploy

Después de cada deploy, verificar:

1. **Sentry Dashboard**: sin errores nuevos en `sentry.io`
2. **Vercel Logs**: sin errores 500 en `vercel.com/logs`
3. **Prisma Migrate**: log de migración sin errores en GitHub Actions
4. **Endpoint de salud**: `GET /api/calendar/sync` responde 200 (requiere auth)
5. **WhatsApp Webhook**: verificar que Meta recibe 200 en `GET /api/whatsapp/webhook`
