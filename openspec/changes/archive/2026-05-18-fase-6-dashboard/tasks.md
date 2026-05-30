# Tasks: Fase 6 — Dashboard Frontend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2,200–2,800 |
| 400-line budget risk | **High** |
| Chained PRs recommended | Yes |
| Suggested split | PR1→UI foundation (9 files) → PR2→Hooks (8 files) → PR3→Components (11 files) → PR4→Pages (5 files) → PR5→Tests |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Base UI primitives + deps + store | PR 1 | main | 9 new files, zero project deps |
| 2 | Data hooks (React Query layer) | PR 2 | main | 8 hooks, depends on existing API types only |
| 3 | Dashboard components | PR 3 | main | 11 components, consume hooks from PR 2 |
| 4 | Page integration + layout rewire | PR 4 | main | 5 pages modified, final assembly |
| 5 | Tests + a11y audit | PR 5 | main | Unit/integration/Lighthouse, verifies spec scenarios |

## Phase 1: Foundation (Base UI + Deps + Store)

- [x] 1.1 Install `date-fns@^3.0` and `recharts@^2.0` in package.json
- [x] 1.2 Update `src/store/useStore.ts` — Zustand slices (auth, UI, modal, filter, calendar) merged via StateCreator **(deviation: added to existing store instead of separate `src/stores/dashboard.ts`, per PR 1 orchestrator scope)**
- [x] 1.3 Create `src/components/ui/Button.tsx` — variants (primary/secondary/danger/ghost), sizes (sm/md/lg), loading state, forwardRef
- [x] 1.4 Create `src/components/ui/Input.tsx` — label, error message, forwardRef, aria-describedby + aria-invalid
- [x] 1.5 Create `src/components/ui/Modal.tsx` — overlay, close btn, focus trap, aria-modal, Esc close, role=dialog, aria-labelledby
- [x] 1.6 Create `src/components/ui/Card.tsx` — padding, shadow, optional header/footer children slots
- [x] 1.7 Create `src/components/ui/Table.tsx` — sortable headers (aria-sort), loading skeleton rows, empty state slot
- [x] 1.8 Create `src/components/ui/Spinner.tsx` — Tailwind animate-spin + sr-only text (PR 1 scope: missing UI primitives)
- [x] 1.9 Create `src/components/ui/EmptyState.tsx` — centered icon + message + optional action button (PR 1 scope)
- [x] 1.10 Create `src/components/ui/StatusBadge.tsx` — color-coded pill PENDING=yellow, CONFIRMED=green, CANCELLED=red, COMPLETED=blue (PR 1 scope)
- [x] 1.11 Create `src/lib/constants.ts` — business hours, type/status labels + colors, day names in Spanish (PR 1 scope)
- [x] 1.12 Create `src/lib/formatters.ts` — formatDate, formatTime, formatCurrency, formatPhoneNumber (PR 1 scope)

## Phase 2: Data Hooks (React Query Layer)

- [x] 2.1 Create `src/hooks/useAppointments.ts` — queryKey=["appointments",filters], GET /api/appointments?status=&date=
- [x] 2.2 Create `src/hooks/useAppointmentMutations.ts` — create/update/delete/confirm/cancel via useMutation, invalidate ["appointments"]
- [x] 2.3 Create `src/hooks/usePatients.ts` — queryKey=["patients",search], GET /api/patients?search=, debounce 300ms
- [x] 2.4 Create `src/hooks/usePatient.ts` — queryKey=["patients",id], GET /api/patients/[id], enabled only when id≠null
- [x] 2.5 Create `src/hooks/usePatientMutations.ts` — create/update/delete mutations, invalidate ["patients"]
- [x] 2.6 Create `src/hooks/useCalendar.ts` — month/week/day grid via date-fns, fetches appointments for visible range
- [x] 2.7 Create `src/hooks/useAvailableSlots.ts` — queryKey=["slots",date], GET /api/appointments/available-slots
- [x] 2.8 Create `src/hooks/useStatistics.ts` — fetches 12mo appointments, client-computes overview/byMonth/byType/completionTrend

## Phase 3: Dashboard Components

- [x] 3.1 Create `src/components/dashboard/Sidebar.tsx` — navItems, pathname, sidebarOpen, toggle, responsive overlay <768px
- [x] 3.2 Create `src/components/dashboard/Header.tsx` — pageTitle from pathname, user avatar, signOut
- [x] 3.3 Create `src/components/dashboard/StatsCard.tsx` — label, value, color accent, trend arrow, loading/error states
- [x] 3.4 Create `src/components/dashboard/FilterBar.tsx` — status dropdown, date filter, search input, debounce 300ms
- [x] 3.5 ~~Create `src/components/dashboard/EmptyState.tsx`~~ — ya existe en `src/components/ui/EmptyState.tsx` desde PR 1
- [x] 3.6 Create `src/components/dashboard/ConfirmDialog.tsx` — "¿Estás seguro?" modal, confirm/cancel, focus trap, aria-modal
- [x] 3.7 Create `src/components/dashboard/CalendarView.tsx` (nombrado CalendarView en vez de Calendar) — CSS Grid 7-col month/week/day views, colored dots by type, keyboard arrows nav, aria-label per cell, today highlight
- [x] 3.8 Create `src/components/dashboard/AppointmentModal.tsx` — react-hook-form + Zod, patient search (usePatients), date picker, available-slots (useAvailableSlots), create/edit modes
- [x] 3.9 Create `src/components/dashboard/PatientForm.tsx` — name/phone/email fields, Zod validation, create/edit modes
- [x] 3.10 Create `src/components/dashboard/AppointmentDetail.tsx` — read-only detail modal con acciones Confirmar/Cancelar/Editar. (Reemplaza PatientDetailModal: el PR scope priorizó detalle de cita sobre paciente.) También creados: `AppointmentList.tsx` (tabla de citas).

## Phase 4: Page Integration + Layout Rewire

- [x] 4.1 Modify `src/app/(dashboard)/layout.tsx` — extract inline sidebar/header to Sidebar+Header imports, wrap children with QueryClientProvider (staleTime: 30s, retry: 1). Responsive padding.
- [x] 4.2 Modify `src/app/(dashboard)/dashboard/page.tsx` — StatsCard×4 (citas hoy, pacientes nuevos, tasa completadas, tasa cancelación) via useStatistics. Últimas 5 citas via useAppointments. Quick action buttons (Nueva Cita, Nuevo Paciente, Ver Estadísticas). Loading/empty/error states.
- [x] 4.3 Modify `src/app/(dashboard)/dashboard/appointments/page.tsx` — CalendarView/AppointmentList toggle. FilterBar (status/date/search). AppointmentModal (create/edit). AppointmentDetail (view with Confirm/Cancel/Edit). CalendarView delegates dateFilter to store on day click.
- [x] 4.4 Modify `src/app/(dashboard)/dashboard/patients/page.tsx` — Search input with 300ms debounce via Zustand searchQuery. Table with name/phone/email/citas/actions columns. PatientForm modal (create/edit). ConfirmDialog (delete). Inline expansion: click row → últimas citas. Error state with retry.
- [x] 4.5 Modify `src/app/(dashboard)/dashboard/statistics/page.tsx` — Recharts BarChart (citas por mes), PieChart (por tipo), LineChart (tendencia completadas 12m). StatsCards row. Nuevos vs recurrentes cards. Zero-data empty state. Loading spinner. Spanish labels.

## Phase 5: Tests + Accessibility ✅ COMPLETE

- [x] 5.1 Unit test useCalendar — `tests/unit/useCalendar.test.ts` (grid generation month/week/day, navigation next/prev/today, empty month, loading/error states). Uses jest.fn() mocks for useAppointments + useStore.
- [x] 5.2 Unit test useStatistics — `tests/unit/useStatistics.test.ts` (overview, appointmentsByMonth, byType, byStatus, completionTrend, cancellationRate, newVsReturning, loading/error). Uses jest.fn() mocks for useAppointments + usePatients.
- [x] 5.3 Unit test presentational components — `tests/unit/components.test.tsx` (StatsCard value/title/trend/loading/error, StatusBadge status colors + aria, EmptyState message/icon/action, Spinner sizes + aria). RTL with @jest-environment jsdom.
- [x] 5.4 Integration test AppointmentModal — `tests/integration/AppointmentModal.test.tsx` (Zod validation errors, patient search + selection, slot availability, submit create/edit, cancel). Mocks useAppointmentMutations, usePatients, useAvailableSlots.
- [x] 5.5 Integration test CalendarView keyboard navigation — `tests/integration/CalendarView.test.tsx` (ArrowLeft/Right/Enter/Space/Tab, view switching month/week/day, goToNext/Prev/Today, loading/error states, aria labels/selected, dot colors). Mocks useCalendar + useStore.
- [x] 5.6 A11y audit — `tests/a11y/a11y-audit.test.tsx` (Modal ARIA attributes, StatusBadge contrast, EmptyState/Spinner roles, Calendar requirements documented). jest-axe NOT installed — tests verify ARIA attributes directly. Recommendations for Lighthouse ≥90 documented.
- [x] 5.7 Quality gates — TypeScript (`tsc --noEmit`): ✅ zero errors. ESLint (`next lint`): ✅ no warnings or errors. Build (`next build`): ✅ compiled successfully, all 29 pages generated.
