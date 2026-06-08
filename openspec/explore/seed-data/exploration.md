# Exploration: seed-data

## Topic
Can test/seed data be added to verify the system works?

## Current State

The project already HAS a seed script at `prisma/seed.ts` with the `db:seed` npm script configured (`package.json` line 19). The current seed creates:

| Entity | Count | Coverage |
|--------|-------|----------|
| User | 2 | ADMIN + DENTIST roles |
| Patient | 5 | Realistic Argentine names, phones, birthdates |
| Appointment | 3 | Tomorrow + next week, only PENDING status, only LIMPIEZA/REVISION/OTRO types |

**What's missing from the seed** (not covered by any existing data):

| Model | Seeded? | Notes |
|-------|---------|-------|
| `Message` | No | Dentist-to-dentist messaging — no test conversations |
| `WhatsAppMessage` | No | WhatsApp integration untested with real data |
| `ConversationState` | No | WhatsApp chatbot state machine not testable |
| `CalendarConnection` | No | Google Calendar OAuth flow not testable end-to-end |
| `PasswordResetToken` | No | Password reset flow not testable |
| `Appointment` statuses | Partial | Only PENDING — CONFIRMED/CANCELLED/COMPLETED missing |
| `Appointment` types | Partial | URGENCIA/TRATAMIENTO types not seeded |

## Affected Areas

- `prisma/seed.ts` — needs to be expanded to cover all models and edge cases
- `package.json` — already has `db:seed` script; no changes needed
- `prisma/schema.prisma` — all models are defined; no schema changes needed
- `tests/integration/` — existing tests use mocks; real seed data would complement integration tests

## Approaches

### 1. Expand existing `prisma/seed.ts` (Recommended)
Extend the current seed script to populate all models.

- **Pros**: Native Prisma, migrations-aware, type-safe, already wired to `db:seed`, no new dependencies
- **Cons**: Grows into a large file if overdone; need to avoid hardcoded IDs for relational data
- **Effort**: Low-Medium

### 2. Separate seed files per domain
Create `prisma/seeds/auth.seed.ts`, `prisma/seeds/whatsapp.seed.ts`, etc., and compose them.

- **Pros**: Better separation, easier to run domain-specific seeds independently
- **Cons**: More files to maintain; requires runner script or `ts-node` orchestration
- **Effort**: Medium

### 3. SQL fixture files + Prisma execute
Write raw SQL in `prisma/fixtures/` and run via `prisma.$executeRaw`.

- **Pros**: Fast bulk inserts; DB-native
- **Cons**: No type safety; breaks if schema changes; harder to debug
- **Effort**: Medium

### 4. Factory library (e.g. `@faker-js/faker`)
Replace hardcoded values with faker-generated realistic data.

- **Pros**: Infinite data variation; better for stress/edge-case testing
- **Cons**: New dependency; data becomes non-deterministic; less useful for reproducible verification
- **Effort**: Medium

## Recommendation

**Approach 1: Expand `prisma/seed.ts`** — add records for all missing models and all enum variants.

Rationale:
- The seed infrastructure is already in place (`db:seed` script, `bcryptjs`, Prisma client)
- The existing seed follows good patterns (clean slate with `deleteMany`, proper relations via IDs)
- Expanding is lower effort than introducing new files or libraries
- Test data remains deterministic and reproducible — critical for verifying the system

The seed should be expanded to include:
1. **All `AppointmentStatus` variants** (PENDING, CONFIRMED, CANCELLED, COMPLETED)
2. **All `AppointmentType` variants** (LIMPIEZA, REVISION, URGENCIA, TRATAMIENTO, OTRO)
3. **`Message` records** — test the dentist-to-dentist messaging UI
4. **`WhatsAppMessage` records** — test the WhatsApp webhook handler and message history
5. **`ConversationState` records** — test the WhatsApp chatbot state transitions
6. **`CalendarConnection` record** — test calendar sync with a mock ACTIVE connection
7. **`PasswordResetToken`** — test the reset flow end-to-end

## Risks

- **Data pollution in dev**: Running `db:seed` during development could overwrite manually entered test data — the seed clears all tables before inserting. Document this behavior clearly.
- **Passwords in seed**: Admin credentials (`admin@odontologia.com` / `admin123`) are in plain text in the seed file — acceptable for dev, must never appear in production.
- **Future schema changes**: If the schema changes, the seed can break. Recommend running `db:seed` as part of the `postinstall` hook or documenting it in onboarding.

## Ready for Proposal

**Yes.** The expansion of `prisma/seed.ts` is a well-scoped change. Next step: **sdd-propose** to define scope, approach, and what constitutes "done" for the seed expansion.
