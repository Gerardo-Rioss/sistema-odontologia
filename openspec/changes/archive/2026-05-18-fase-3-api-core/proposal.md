# Proposal: Modelo de Datos y API Core (Fase 3)

## Intent

Transformar los stubs de API, servicios y repositorios en implementaciones CRUD reales para citas y pacientes, completar el esquema de base de datos con el modelo Message y establecer la arquitectura de capas (route → service → repository → Prisma) como patrón para fases futuras.

## Scope

### In Scope
- Implementar CRUD real en 8 route handlers (GET/POST/PATCH/DELETE para `/api/appointments` y `/api/patients`)
- Implementar `AppointmentService` (5 métodos) y `PatientService` (4 métodos) con lógica de negocio
- Crear `AppointmentRepository` y `PatientRepository` implementando `IRepository<T>`
- Integrar validación Zod (`CreateAppointmentDTO`, `CreatePatientDTO`, `UpdateAppointmentDTO`) en los route handlers
- Agregar modelo `Message` al esquema Prisma + migración
- Estandarizar respuestas API con `ApiResponse<T>` wrapper
- Proteger todos los endpoints con autenticación vía NextAuth session check

### Out of Scope
- Calendar sync (Fase 4), WhatsApp integration (Fase 5)
- Frontend UI para citas/pacientes
- Endpoints CRUD para Message (solo modelo)
- Búsqueda avanzada, paginación, filtrado en API
- Rate limiting en endpoints de citas/pacientes (aplica solo a `/api/auth/*`)

## Capabilities

### New Capabilities
- `appointment-crud`: CRUD de citas con Zod validation, repository pattern, service layer. Endpoints: GET/POST `/api/appointments`, GET/PATCH/DELETE `/api/appointments/[id]`
- `patient-crud`: CRUD de pacientes con Zod validation, repository pattern, service layer. Endpoints: GET/POST `/api/patients`, GET/PATCH/DELETE `/api/patients/[id]`

### Modified Capabilities
- `database-schema`: Agregar modelo `Message` (id, content, senderId, receiverId, appointmentId, createdAt) con relaciones a User y Appointment. Resolver discrepancia DTO↔modelo: Patient usa `name` (string único) pero DTO espera `firstName`/`lastName`; Appointment usa `date`+`time` separados pero DTO usa `dateTime` combinado.

## Approach

Patrón en tres capas consistente:
1. **Route handlers** validan con Zod, delegan a service, envuelven respuesta en `ApiResponse<T>`
2. **Services** orquestan lógica de negocio (ej: al crear cita, verificar disponibilidad; al eliminar paciente, cascade de citas)
3. **Repositories** encapsulan acceso a Prisma, extienden `IRepository<T>`

Autenticación: verificar sesión NextAuth en cada handler y asignar `userId` automáticamente. El DENTIST solo gestiona sus propios pacientes/citas.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Agregar modelo Message |
| `src/app/api/appointments/route.ts` | Modified | Implementar GET/POST reales |
| `src/app/api/appointments/[id]/route.ts` | Modified | Implementar GET/PATCH/DELETE reales |
| `src/app/api/patients/route.ts` | Modified | Implementar GET/POST reales |
| `src/app/api/patients/[id]/route.ts` | Modified | Implementar GET/PATCH/DELETE reales |
| `src/services/appointment.service.ts` | Modified | Implementar 5 métodos |
| `src/services/patient.service.ts` | Modified | Implementar 4 métodos |
| `src/repositories/` | New | Crear appointment.repository.ts, patient.repository.ts |
| `src/lib/validations.ts` | Modified | Alinear DTOs con schema Prisma real |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Discrepancia DTO↔schema rompe validación | High | Resolver en design: unificar campos o crear mapeo explícito service↔Prisma |
| Eliminar paciente con citas viola integridad | Low | Prisma ya define `onDelete: Cascade` en ambos modelos |
| Fuga de datos entre dentistas (multi-tenant) | Medium | Todo handler filtra por `userId` de sesión; validar con tests |

## Rollback Plan

Revertir migration de Message con `prisma migrate dev --name revert-message`. Los route handlers son reemplazos directos de stubs — rollback es un `git revert` del commit. Servicios y repositorios son nuevos sin impacto en código existente.

## Dependencies

- Fase 2 completada (auth, sesiones NextAuth, `prisma` singleton, `IRepository<T>`)
- PostgreSQL corriendo con migraciones existentes aplicadas

## Success Criteria

- [ ] GET/POST/PATCH/DELETE en `/api/appointments` y `/api/patients` responden con datos reales de BD
- [ ] Validación Zod rechaza datos inválidos con errores en español
- [ ] `AppointmentService` y `PatientService` operan sin errores (schedule, reschedule, cancel, confirm, create, update, search, getHistory)
- [ ] `Message` model existe en schema y migración aplicada sin errores
- [ ] Endpoints requieren sesión (401 si no autenticado)
- [ ] `npm run type-check` y `npm run lint` pasan sin errores
