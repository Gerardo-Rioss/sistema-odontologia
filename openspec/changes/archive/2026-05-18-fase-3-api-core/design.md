# Design: API Core — Appointments & Patients CRUD

## Technical Approach

Implement the three-layer architecture (route → service → repository → Prisma) established in Fase 2. Eight route handlers call Zod-validated services, which delegate to repositories implementing `IRepository<T>`. Multi-tenant isolation enforced at the repository layer via `userId` filtering from the NextAuth session. DTOs realigned to match Prisma models exactly — no schema migration beyond adding the Message model.

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| Patient DTO field names | `firstName`+`lastName` (split) | `name` (single, matches Prisma) | **B** | User split its name field for auth/email display purposes; Patient has no such need. Single `name` avoids ambiguous splitting on read-back. Zero migration. |
| Appointment DTO date/time | `dateTime` (combined ISO) | `date` (ISO date) + `time` (HH:mm) | **B** | Prisma stores `date` as `@db.Date` and `time` as `String` — accepting them separately avoids parsing ambiguity and matches the database natively. |
| Multi-tenant isolation layer | Middleware/route-level check | Repository-level `userId` filter | **Repository** | Every `findMany`/`findUnique` in repositories accepts `userId` and filters by it. Prevents data leaks even if a future service bypasses route checks. |
| Repository `findAll` with tenant | Extend `IRepository<T>` signature | Add domain-specific methods (`findAllByUser`) | **Domain methods** | Keeps `IRepository<T>` generic and clean (used by UserRepository without tenant). `AppointmentRepository.findAllByUser(userId)` + `PatientRepository.findAllByUser(userId)` follow the `UserRepository.findByEmail` precedent. |

## Data Flow

```
Route Handler                Service                    Repository            Prisma
─────────────               ─────────                 ────────────           ──────
1. auth() → session
2. Zod .safeParse(body) ───→ schedule(dto, userId) ──→ findByDate(userId) ──→ findMany
      ↓ 400 if invalid              ↓                       ↓
3. return ApiResponse        verify no conflict      create({...userId}) ──→ create
   {success, data, 201}      ↓ 409 if duplicate           ↓
                           return appointment        return Appointment
```

Error path: Service throws → Route catches → `NextResponse.json({error: "mensaje"}, {status: 4xx/500})`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/validations.ts` | Modify | Replace `CreatePatientDTO`/`CreateAppointmentDTO`/`UpdateAppointmentDTO` to match Prisma fields; add `UpdatePatientDTO` |
| `src/types/index.ts` | Modify | Add missing fields: `Appointment.time`, `Appointment.type`, `Patient.userId`, `Patient.updatedAt`, `Patient.notes` |
| `prisma/schema.prisma` | Modify | Add `Message` model (id, content, senderId, receiverId, appointmentId?, createdAt) with User+Appointment relations |
| `src/repositories/appointment.repository.ts` | Create | Implements `IRepository<Appointment>` + `findAllByUser(userId)`, `findByDate(userId, date)`, `findByPatient(userId, patientId)` |
| `src/repositories/patient.repository.ts` | Create | Implements `IRepository<Patient>` + `findAllByUser(userId)`, `searchByName(userId, query)` |
| `src/services/appointment.service.ts` | Modify | Implement `schedule`, `reschedule`, `cancel`, `confirm`, `getAll`, `getById` |
| `src/services/patient.service.ts` | Modify | Implement `create`, `update`, `getAll`, `getById`, `search`, `getHistory` |
| `src/app/api/appointments/route.ts` | Modify | Real GET (list) + POST (create) with session check + Zod |
| `src/app/api/appointments/[id]/route.ts` | Modify | Real GET (byId), PATCH (update), DELETE with session check + Zod |
| `src/app/api/patients/route.ts` | Modify | Real GET (list) + POST (create) with session check + Zod |
| `src/app/api/patients/[id]/route.ts` | Modify | Real GET (byId), PATCH (update), DELETE with session check + Zod |

## Interfaces / Contracts

**Updated DTOs** (`validations.ts`):
```ts
export const CreatePatientDTO = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().datetime("Fecha inválida").optional(),
  notes: z.string().optional(),
});

export const CreateAppointmentDTO = z.object({
  patientId: z.string().min(1, "El paciente es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:mm)"),
  type: z.string().min(1, "El tipo de cita es requerido"),
  notes: z.string().optional(),
});

export const UpdateAppointmentDTO = z.object({
  date: z.string().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida").optional(),
  status: z.enum(["SCHEDULED","COMPLETED","CANCELLED"]).optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
});
```

**API Response contract** (`ApiResponse<T>`):
- `200`: `{success:true, data: T | T[]}`
- `201`: `{success:true, data: T}`
- `400`: `{error:"Datos inválidos", details: fieldErrors}`
- `401`: `{error:"No autorizado"}`
- `404`: `{error:"Recurso no encontrado"}`
- `409`: `{error:"Conflicto de horario"}`
- `500`: `{error:"Error interno del servidor"}`

**Message model** (`schema.prisma`):
```prisma
model Message {
  id            String   @id @default(cuid())
  content       String
  senderId      String
  receiverId    String
  appointmentId String?
  createdAt     DateTime @default(now())
  sender        User     @relation("SentMessages", fields:[senderId], references:[id], onDelete:Cascade)
  receiver      User     @relation("ReceivedMessages", fields:[receiverId], references:[id], onDelete:Cascade)
  appointment   Appointment? @relation(fields:[appointmentId], references:[id], onDelete:SetNull)
  @@map("messages")
}
```

**Repository interface extensions**:
```ts
class AppointmentRepository implements IRepository<Appointment> {
  findAllByUser(userId: string): Promise<Appointment[]>;
  findByDate(userId: string, date: Date): Promise<Appointment[]>;
  findByPatient(userId: string, patientId: string): Promise<Appointment[]>;
  // + base CRUD (all methods accept userId filter)
}
class PatientRepository implements IRepository<Patient> {
  findAllByUser(userId: string): Promise<Patient[]>;
  searchByName(userId: string, query: string): Promise<Patient[]>;
  // + base CRUD
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit — validations | Zod DTOs reject invalid shapes | `safeParse` with boundary cases (missing fields, bad email, wrong time format) |
| Unit — services | Business logic (conflict detection, status transitions) | Mock repository, verify thrown errors and correct repo calls |
| Integration — repositories | Prisma queries with real test DB | `@quramy/jest-prisma` or seeded test DB; verify userId filtering |
| Integration — routes | HTTP requests against running app | `fetch` with mocked `auth()` session; assert status codes + response shape |

## Migration / Rollout

- `prisma migrate dev --name add-message-model` creates the Message table
- No data migration needed (Message is additive; DTO changes only affect new requests)
- Rollback: `git revert` + `prisma migrate dev --name revert-message`

## Open Questions

- [ ] Should `GET /api/appointments` return patient name inline (Prisma `include`) or only IDs? Pro: include for convenience. Con: extra join. Decision deferred to `sdd-apply`.
- [ ] Should `DELETE /api/patients/[id]` soft-delete or hard-delete? Prisma `onDelete: Cascade` already handles Appointment cleanup. Proposal implies hard-delete — confirm.
