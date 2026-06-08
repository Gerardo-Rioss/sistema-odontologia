# Proposal: expand-seed-data

## Intent

Expand `prisma/seed.ts` to populate all 7 models with representative test data, covering every enum variant, so the system can be verified end-to-end without manual data entry.

## Scope

### In Scope
- Add records for all missing models: `Message`, `WhatsAppMessage`, `ConversationState`, `CalendarConnection`, `PasswordResetToken`
- Cover all `AppointmentStatus` variants: PENDING, CONFIRMED, CANCELLED, COMPLETED
- Cover all `AppointmentType` variants: LIMPIEZA, REVISION, URGENCIA, TRATAMIENTO, OTRO
- Add `deleteMany` cleanup for new tables before insert (clean-slate pattern)
- Existing seed data for User, Patient, Appointment preserved

### Out of Scope
- New seed files or seed runner refactoring
- `@faker-js/faker` or other data-generation libraries
- Modifying `package.json` scripts (already wired)
- Schema changes to `prisma/schema.prisma`

## Capabilities

### New Capabilities
- `seed-data-complete`: Deterministic test data covering all models and enum variants for end-to-end verification

### Modified Capabilities
- None (existing appointment-crud, whatsapp-conversation, calendar-oauth, user-auth capabilities unchanged — seed data supports their testing)

## Approach

Expand `prisma/seed.ts` in place. Keep the clean-slate `deleteMany` pattern. Add sections for each missing model after the existing appointment block. Use hardcoded IDs derived from existing seed records to maintain referential integrity.

```ts
// Order: User → Patient → Appointment → Message → WhatsAppMessage → ConversationState → CalendarConnection → PasswordResetToken
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/seed.ts` | Modified | Add 5 new model sections; cover all enum variants |
| `package.json` | None | No changes needed |
| `prisma/schema.prisma` | None | No changes needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data pollution — `deleteMany` clears all tables | High | Document clearly; `--preserve` flag deferred to future iteration |
| Hardcoded admin password (`admin123`) | Low | Already exists; acceptable for dev only |
| Seed breaks if schema changes | Medium | Document in onboarding docs; recommend `postinstall` hook |

## Rollback Plan

Revert `prisma/seed.ts` to last known working state via git. No migration rollback needed — seed only writes data, not schema.

## Dependencies

- `bcryptjs` (already in use)
- `prisma` CLI and `db:seed` npm script (already configured)

## Success Criteria

- [ ] `db:seed` creates data for ALL 8 models: User, Patient, Appointment, Message, WhatsAppMessage, ConversationState, CalendarConnection, PasswordResetToken
- [ ] All `AppointmentStatus` enum values appear (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- [ ] All `AppointmentType` enum values appear (LIMPIEZA, REVISION, URGENCIA, TRATAMIENTO, OTRO)
- [ ] `npx prisma db seed` runs without errors on a fresh database
- [ ] Existing tests still pass after seed expansion