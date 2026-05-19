# Sistema de Gestión Odontológica

Plataforma integral para la administración de consultorios odontológicos. Automatización de citas vía WhatsApp, sincronización con Google Calendar y dashboard administrativo completo.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 14 (App Router + Server Components) |
| **Lenguaje** | TypeScript 5.4+ |
| **UI** | React 18, Tailwind CSS 3, Framer Motion |
| **Estado** | React Query, Zustand |
| **Formularios** | React Hook Form + Zod |
| **Autenticación** | NextAuth.js v5 (JWT + Credentials) |
| **Base de Datos** | PostgreSQL + Prisma ORM |
| **Testing** | Jest, React Testing Library, Playwright |
| **CI/CD** | GitHub Actions, Vercel, Railway |
| **Monitoreo** | Sentry |
| **Integraciones** | WhatsApp Business API, Google Calendar API |

## Arquitectura

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, registro, recuperación
│   ├── (dashboard)/        # Panel de administración
│   └── api/                # API Routes (REST)
├── components/             # Componentes React (UI, auth, dashboard)
├── hooks/                  # Custom hooks (useAppointments, usePatients)
├── lib/                    # Utilidades (auth, prisma, validations)
├── repositories/           # Acceso a datos (Repository Pattern)
├── services/               # Lógica de negocio (Service Layer)
├── store/                  # Estado global (Zustand)
└── types/                  # Tipos TypeScript compartidos
```

### Patrones

- **Repository Pattern**: abstrae el acceso a Prisma en `src/repositories/`
- **Service Layer**: lógica de negocio en `src/services/`, independiente del framework
- **DTO + Zod**: validación de entrada/salida con esquemas tipados en `src/lib/validations.ts`
- **Server Components**: páginas renderizadas en servidor, componentes cliente solo donde es necesario

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- npm 10+

## Configuración Inicial

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd sistema-odontologia

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 4. Iniciar PostgreSQL (Docker)
docker compose up -d

# 5. Ejecutar migraciones
npx prisma migrate dev

# 6. Poblar la base de datos (opcional)
npm run db:seed

# 7. Iniciar servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar servidor producción |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript type-check |
| `npm test` | Tests unitarios e integración |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run test:all` | Todos los tests |
| `npm run db:push` | Sincronizar schema con DB |
| `npm run db:migrate` | Crear nueva migración |
| `npm run db:generate` | Generar Prisma Client |
| `npm run db:seed` | Poblar base de datos |
| `npm run db:studio` | Prisma Studio (UI) |
| `npm run db:reset` | Resetear base de datos |
| `npm run format` | Formatear código (Prettier) |

## API

Documentación completa en [`docs/API.md`](./docs/API.md).

### Resumen de Endpoints

| Módulo | Endpoints |
|--------|-----------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `/api/auth/[...nextauth]` |
| **Pacientes** | `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/[id]` |
| **Citas** | `GET/POST /api/appointments`, `GET/PUT/DELETE /api/appointments/[id]`, `PATCH /api/appointments/[id]/confirm`, `PATCH /api/appointments/[id]/cancel`, `GET /api/appointments/available-slots` |
| **Calendario** | `GET /api/calendar/auth`, `GET /api/calendar/auth/callback`, `GET/POST /api/calendar/sync`, `GET /api/calendar/status`, `POST /api/calendar/disconnect`, `GET/POST /api/calendar/webhook` |
| **WhatsApp** | `GET/POST /api/whatsapp/webhook`, `POST /api/whatsapp/send`, `GET /api/whatsapp/cron/reminders` |
| **Estadísticas** | `GET /api/statistics/overview` |

### Seguridad

- **Auth**: sesiones JWT vía NextAuth.js (24h de expiración)
- **Rate Limiting**: 5 req/15 min en endpoints de auth
- **Validación**: Zod en todos los endpoints
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options (configurados en `vercel.json`)

## Despliegue

Ver [`DEPLOY.md`](./DEPLOY.md) para la guía completa de despliegue, checklist pre-deploy y plan de rollback.

### Flujo CI/CD

```
Push a main
  → GitHub Actions: lint + type-check + build (CI)
  → Prisma migrate deploy
  → Deploy a Vercel
  → Sentry release (source maps)
```

### Backups

- **Primario**: backups diarios automáticos en Railway
- **Secundario**: `bash scripts/backup.sh` para backup manual con `pg_dump`

## Testing

```bash
# Unitarios + Integración
npm test

# End-to-end
npm run test:e2e

# Todos
npm run test:all
```

Cobertura actual: **372 tests**.

## Estructura de Archivos

```
sistema-odontologia/
├── .github/workflows/      # CI/CD pipelines
│   ├── ci.yml              # Lint, type-check, build
│   └── deploy.yml          # Vercel deploy + migrate
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   └── migrations/         # Migraciones
├── scripts/
│   └── backup.sh           # Script de backup PostgreSQL
├── src/
│   ├── app/                # Rutas y páginas
│   ├── components/         # Componentes React
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilidades y config
│   ├── repositories/       # Acceso a datos
│   ├── services/           # Lógica de negocio
│   ├── store/              # Estado global
│   └── types/              # Tipos TypeScript
├── tests/                  # Tests
├── docs/
│   └── API.md              # Documentación de API
├── vercel.json             # Config Vercel (headers, CORS)
├── sentry.client.config.ts # Config Sentry (cliente)
├── sentry.server.config.ts # Config Sentry (servidor)
├── sentry.edge.config.ts   # Config Sentry (edge)
├── next.config.mjs         # Config Next.js + Sentry
├── DEPLOY.md               # Guía de despliegue
└── README.md               # Este archivo
```

## Variables de Entorno

Copiá `.env.example` a `.env` y configurá las variables. Las variables requeridas son:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL |
| `NEXTAUTH_SECRET` | Secreto de sesiones |
| `NEXTAUTH_URL` | URL de la aplicación |
| `WHATSAPP_TOKEN` | Token de WhatsApp Business API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp |
| `CRON_SECRET` | Secreto para endpoint de cron |
| `GOOGLE_CLIENT_ID` | OAuth2 Google (Calendar) |
| `GOOGLE_CLIENT_SECRET` | Secreto OAuth2 Google |
| `SENTRY_DSN` | DSN de Sentry |

## Licencia

Privado. Todos los derechos reservados.
