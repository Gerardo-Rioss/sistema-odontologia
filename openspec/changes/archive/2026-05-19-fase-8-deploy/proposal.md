# Proposal: Fase 8 — Despliegue y Documentación

## Intent

Preparar el sistema para producción: CI/CD con deploy automático en Vercel, monitoreo de errores con Sentry, backups de base de datos, y documentación completa (README, API docs, checklist pre-deploy). Fase 8, última del roadmap.

## Scope

### In Scope
- `vercel.json` con config de producción (regiones, headers, redirects)
- `deploy.yml` activo: Vercel deploy + Prisma migrate en push a `main`
- Sentry: configs `client` / `server` / `edge` + extensión de `instrumentation.ts`
- Script de backup PostgreSQL (`pg_dump` + cron externo / Railway backup config)
- `.env.production` template con defaults seguros
- Checklist pre-deploy verificable
- Plan de rollback documentado
- `README.md` completo en español
- Documentación de API (`docs/API.md`) con endpoints y ejemplos

### Out of Scope
- Creación de cuentas cloud reales (Vercel, Railway, Sentry)
- Compra/registro de dominio
- Credenciales reales en repositorio
- Deploy efectivo a producción (requiere cuentas configuradas)
- Video tutorial / manual de usuario

## Capabilities

### New Capabilities
- `production-deploy`: Pipeline automatizado a Vercel, `vercel.json`, Prisma migrate en CI
- `error-monitoring`: Integración Sentry (client, server, edge) con instrumentation hook
- `database-backups`: Script `pg_dump`, cron config, guía de restore
- `api-documentation`: Documentación Markdown de endpoints con request/response de ejemplo

### Modified Capabilities
- `ci-cd-pipeline`: `deploy.yml` pasa de placeholder comentado a workflow activo con deploy y migrate

## Approach

Configuración declarativa (`vercel.json`, env templates, Sentry configs), sin refactors del código existente. `instrumentation.ts` se extiende para inicializar Sentry (sin reemplazar el cron existente). El deploy CI se integra al workflow actual: CI en PR, deploy solo en push a `main`. Documentación generada como archivos Markdown planos (sin Swagger/OpenAPI tooling por simplicidad).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/deploy.yml` | Modified | Placeholder → workflow activo |
| `/vercel.json` | New | Config de producción Vercel |
| `src/instrumentation.ts` | Modified | Añade `Sentry.init()` |
| `src/lib/sentry.*.ts` | New | Configs por runtime |
| `scripts/backup.sh` | New | Script `pg_dump` |
| `.env.production` | New | Template vars producción |
| `docs/API.md` | New | Documentación endpoints |
| `README.md` | New | Documentación completa proyecto |
| `DEPLOYMENT.md` | New | Checklist + plan de rollback |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sentry SDK incompatible con config actual | Low | Next.js 14 con `instrumentationHook: true` ya habilitado en `next.config.mjs` |
| Prisma migrate en CI requiere `DATABASE_URL` expuesta | Med | Secretos como GitHub Actions secrets, documentados en env template |
| Backup script depende de acceso directo a BD | Med | Guía dual: Railway backups automáticos + `pg_dump` manual |
| Documentación se desactualiza | Med | Markdown simple, enlazado con specs SDD existentes |

## Rollback Plan

- **Deploy fallido**: Vercel revierte automáticamente al último deploy exitoso
- **Migración fallida**: `prisma migrate resolve --rolled-back` + restore desde backup Railway
- **Sentry causa errores**: Desactivar con `SENTRY_ENABLED=false` en variables de entorno
- **Volver al estado anterior**: Revertir commit en `main`, Vercel redeploya desde el commit anterior

## Dependencies

- Proyecto Vercel (ID y token) — documentados como `secrets.*`, no hardcodeados
- Proyecto Sentry (DSN) — documentado, no hardcodeado
- Fases 1-7 completas (372/374 tests passing)

## Success Criteria

- [ ] `deploy.yml` activo: deploy + migrate en push a `main`
- [ ] `vercel.json` con headers de seguridad y CORS configurados
- [ ] Sentry captura errores en server y client
- [ ] Script de backup funcional (`pg_dump`) + guía Railway
- [ ] `README.md` cubre setup, stack, arquitectura, deployment
- [ ] `docs/API.md` documenta todos los endpoints con ejemplos
- [ ] Checklist pre-deploy verificable pre-lanzamiento
- [ ] Plan de rollback con pasos concretos y comandos
