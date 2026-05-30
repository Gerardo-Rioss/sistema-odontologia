# Proposal: Setup Inicial — Arquitectura y Herramientas Base

## Intent

El proyecto está en fase de planificación: sin repositorio, sin código, sin infraestructura. Ninguna fase posterior puede comenzar hasta que exista el ecosistema base. Este cambio establece el andamiaje completo sobre el cual se construirá el sistema de gestión odontológica. Se ejecuta ahora porque es el prerrequisito bloqueante para las Fases 2-8 del roadmap.

## Scope

### In Scope
- Inicializar repositorio Git (`main` + `develop`) con `.gitignore`
- Crear proyecto Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Crear estructura de directorios completa (`src/`, `prisma/`, `tests/`, `public/`, `.github/`)
- Configurar ESLint + Prettier con reglas TypeScript
- Definir schema inicial de Prisma: modelos User, Patient, Appointment
- Configurar Docker Compose (PostgreSQL 16 + pgAdmin)
- Crear `.env.example` con variables del stack
- Configurar GitHub Actions CI: lint → type-check → build

### Out of Scope
- Autenticación (NextAuth.js → Fase 2)
- Schema completo de BD (se refina en Fase 3)
- API endpoints (Fase 3+)
- Componentes UI del dashboard (Fase 6)
- Deploy a producción (Fase 8)
- Integraciones externas: WhatsApp, Google Calendar (Fases 4-5)

## Capabilities

### New Capabilities
- `database-schema`: Schema inicial Prisma con modelos User, Patient, Appointment y relaciones base
- `ci-cd-pipeline`: GitHub Actions workflow con lint, type-check, build; deploy a Vercel (placeholder)

### Modified Capabilities
None — proyecto greenfield, sin specs existentes.

## Approach

1. **Git init** → branches `main` + `develop`, `.gitignore` Node/Next.js
2. **Scaffold** vía `create-next-app` (TS + Tailwind), ajustar config manualmente
3. **Directorios**: Crear estructura según Documentación.md §6 (líneas 412-532)
4. **Prisma**: `prisma init` PostgreSQL, definir 3 modelos core, generar migration inicial
5. **Docker**: `docker-compose.yml` con PostgreSQL 16 + pgAdmin
6. **CI/CD**: `.github/workflows/ci.yml` — jobs paralelos de lint, type-check, build
7. **Tooling**: ESLint flat config + Prettier + scripts npm (`dev`, `build`, `lint`, `type-check`, `db:push`)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `/` (root) | New | Config files: package.json, tsconfig, next.config, tailwind.config, docker-compose, .gitignore, .env.example, README |
| `.github/workflows/` | New | ci.yml |
| `prisma/` | New | schema.prisma + migration inicial |
| `src/` | New | Estructura completa con archivos placeholder |
| `tests/` | New | Directorios unit/integration/e2e (vacíos) |

## Impact Estimate

| Métrica | Estimación |
|---------|-----------|
| Archivos nuevos | ~45 (config + estructura + placeholders) |
| Líneas de código | ~800 (config files 300 + Prisma schema 80 + placeholders 400 + CI 20) |
| Complejidad | Baja — configuración declarativa, sin lógica de negocio |
| Tiempo estimado | 2-4 horas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incompatibilidad de versiones Next.js ↔ React ↔ TS | Low | `create-next-app` garantiza combinación compatible; pin versions exactas |
| Schema Prisma definido muy temprano (cambiará en Fase 3) | Med | Solo 3 modelos core con campos mínimos; migrations incrementales después |
| CI con falsos positivos por reglas ESLint muy estrictas | Low | Usar config recomendada (`@typescript-eslint/recommended`); probar CI en PR inicial |

## Rollback Plan

`git reset --hard HEAD~1` revierte todo el cambio. No hay datos de producción ni migraciones aplicadas en staging/prod que requieran rollback de base de datos.

## Dependencies

- Node.js 20+ instalado localmente
- Docker Desktop para desarrollo local
- Cuenta GitHub para repositorio + Actions
- Cuenta Vercel (placeholder — deploy se configura en Fase 8)

## Success Criteria

- [ ] `npm run dev` levanta Next.js sin errores en `localhost:3000`
- [ ] `npx prisma generate` + `npx prisma db push` funcionan sin errores
- [ ] `docker compose up` levanta PostgreSQL accesible en `localhost:5432`
- [ ] `npm run lint` y `npm run type-check` pasan sin errores
- [ ] GitHub Actions CI pasa los 3 jobs en push a `main`
- [ ] Estructura de directorios coincide con el diseño aprobado en Documentación.md §6
