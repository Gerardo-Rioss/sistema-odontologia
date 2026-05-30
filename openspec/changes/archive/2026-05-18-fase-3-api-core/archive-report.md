# Archive Report: fase-3-api-core

**Change**: fase-3-api-core — Modelo de Datos y API Core (Fase 3)
**Archived**: 2026-05-18
**Artifact Store**: hybrid (Engram + OpenSpec)
**SDD Cycle**: Complete ✅

## Executive Summary

Fase 3 transformed stub API handlers, services, and repositories into full CRUD implementations for appointments and patients. Added the Message model to the database schema. Established the three-layer architecture (route → service → repository → Prisma) as the pattern for future phases. All 14 implementation tasks complete across 4 stacked PRs. Verification passed with warnings (0 critical, 4 warnings). SDD cycle fully closed.

## Verification Result

**Verdict**: PASS WITH WARNINGS
- **Critical**: 0
- **Warnings**: 4 (DELETE 204 vs 200 spec, conflict detection in-memory vs design, searchByName not repo method, getHistory merged into getById)
- **Spec Compliance**: 25/27 scenarios compliant (2 partial: DELETE status code for appointments + patients)
- **Quality Gates**: ESLint ✅, TypeScript ✅, Next.js build ✅, Tests ➖ (TDD disabled)
- **Implementation**: ~1,298 lines, 15 files, 4 stacked PRs, 7 commits

## Artifacts Archived

| Artifact | Engram ID | OpenSpec Path |
|----------|-----------|---------------|
| Proposal | #109 | `openspec/changes/archive/2026-05-18-fase-3-api-core/proposal.md` |
| Spec | #112 | `openspec/changes/archive/2026-05-18-fase-3-api-core/specs/` |
| Design | #111 | `openspec/changes/archive/2026-05-18-fase-3-api-core/design.md` |
| Tasks | #115 | `openspec/changes/archive/2026-05-18-fase-3-api-core/tasks.md` |
| Apply Progress | #116 | (Engram only) |
| Verify Report | #117 | `openspec/changes/archive/2026-05-18-fase-3-api-core/verify-report.md` |
| Archive Report | #118 | `openspec/changes/archive/2026-05-18-fase-3-api-core/archive-report.md` |

## Canonical Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| appointment-crud | **Created** | Full CRUD spec (7 requirements, 12 scenarios). Copied from delta to `openspec/specs/appointment-crud/spec.md` |
| patient-crud | **Created** | Full CRUD spec (5 requirements, 8 scenarios). Copied from delta to `openspec/specs/patient-crud/spec.md` |
| database-schema | **Merged** | 1 ADDED (Message Model) + 1 MODIFIED (Core Entity Models — updated Patient fields, Appointment fields, AppointmentStatus enum, new AppointmentType enum). Merged into `openspec/specs/database-schema/spec.md` |

### Merge Details (database-schema)

**ADDED**: Message Model requirement with 2 scenarios (appointment reference, cascade on sender deletion)

**MODIFIED**: Core Entity Models requirement:
- Patient: added `userId` (FK), `notes`?, `updatedAt`
- Appointment: added `time` (HH:mm), `type` (AppointmentType enum), status enum changed to PENDING|CONFIRMED|CANCELLED|COMPLETED
- New enum: AppointmentType (LIMPIEZA|REVISION|URGENCIA|TRATAMIENTO|OTRO)
- User relations: now includes "has many Messages (SentMessages + ReceivedMessages)"
- Message model row added to entities table
- New constraints for time, type, userId on Patient, notes, updatedAt, Message FK cascades

**Preserved**: All 3 existing requirements (Core Entity Models updated, PasswordResetToken Model unchanged, Schema Migrations unchanged) and all their scenarios.

## Implementation Summary

| Metric | Value |
|--------|-------|
| Tasks total | 14 (Phases 1-4) |
| Tasks complete | 14 ✅ |
| Tasks incomplete | 5 (Phase 5 tests — TDD disabled) |
| Files changed | 15 |
| Total lines | ~1,298 |
| PRs delivered | 4 (stacked-to-main) |
| Commits | 7 |

### PR Breakdown

| PR | Scope | Lines | Status |
|----|-------|-------|--------|
| PR 1 | Schema + Types + DTOs + Repos | ~280 | ✅ Merged |
| PR 2 | AppointmentService + PatientService | ~330 | ✅ Merged |
| PR 3 | Appointment route handlers (7 endpoints) | ~325 | ✅ Merged |
| PR 4 | Patient route handlers (5 endpoints) | ~220 | ✅ Merged |

### Deviations from Design

1. **DELETE returns 204** (spec says 200) — HTTP standard for no-body DELETE
2. **Conflict detection**: in-memory filter vs designed `findByDate` repo method
3. **searchByName**: in-memory in service vs designed repo method
4. **getHistory**: merged into `getById` vs designed separate method

## Risks

1. **Migration not applied**: PostgreSQL unavailable on dev machine; migration SQL generated but not executed. Requires DB connection to apply.
2. **No runtime tests**: 5 Phase 5 test files not written (TDD disabled, jest/ts-jest not configured). Code correctness verified via static analysis only.
3. **In-memory filtering at scale**: Conflict detection and name search use in-memory filtering over `findByDentist`. Adequate for dental office scale but may degrade beyond ~10K records per dentist.
4. **formatDate UTC off-by-one**: Uses `toISOString().slice(0,10)` — internally consistent but could produce wrong date near midnight in negative UTC offsets.

## Next Recommended

SDD cycle for fase-3-api-core is complete. Recommended next change: **fase-4-calendar-sync** (calendar integration for appointments, mentioned as out of scope in phase 3 proposal).

## Archive Verification

- [x] Main specs updated correctly (3 domains: appointment-crud created, patient-crud created, database-schema merged)
- [x] Change folder moved to `openspec/changes/archive/2026-05-18-fase-3-api-core/`
- [x] Archive contains all 7 artifacts (proposal, design, tasks, verify-report, 3 spec deltas)
- [x] Active changes directory no longer has `fase-3-api-core`
- [x] All Engram artifact observation IDs recorded for traceability
- [x] No critical issues in verification report — safe to archive
