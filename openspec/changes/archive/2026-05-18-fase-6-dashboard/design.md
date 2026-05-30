# Design: Fase 6 — Dashboard Frontend

## Technical Approach

Client-only architecture consuming existing API routes. React Query handles server state (fetch, cache, mutation invalidation). Zustand handles UI state only (sidebar toggle, modal open/close). React Hook Form + Zod for form validation (reusing existing `@/lib/validations` schemas). Custom CSS Grid calendar (no heavy library). Missing deps: `date-fns`, `recharts`.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| 1 | Calendar impl | Custom CSS Grid vs @fullcalendar vs react-big-calendar | Custom 7-col CSS Grid + date-fns | No drag & drop needed. Libraries add ~200KB. Proposal pre-approved custom approach. |
| 2 | Charts library | Recharts vs Chart.js vs Tremor | Recharts | React-native SVG, declarative API, already proposed. Chart.js is canvas-based (less a11y). Tremor adds bloat. |
| 3 | Date utility | date-fns vs dayjs vs luxon | date-fns | Tree-shakeable, already proposed. Not yet in deps — add `date-fns@^3.0`. |
| 4 | Form layer | react-hook-form (already installed) | React Hook Form | Already installed. Zod resolver via `@hookform/resolvers`. Reuses existing DTO schemas. |
| 5 | Server state | React Query (already installed) | @tanstack/react-query | Already installed. QueryClient provider to wrap dashboard tree. |
| 6 | UI state | Zustand (installed) for UI only | Zustand | Sidebar toggle, modal visibility. Server data stays in React Query. |
| 7 | Component pattern | Container/Presentational | Container/Presentational | Container components own hooks + data fetching. Presentational components receive props only. |
| 8 | Sidebar/Header extraction | Extract from inline layout.tsx into `src/components/dashboard/` | Extract | Layout.tsx is 136 lines with inline sidebar+header. Extract for reusability, testability, and cleaner layout file. |

## Data Flow

```
API Route (Next.js)
    │
    ├─ GET /api/appointments  ──→ useQuery(["appointments", filters]) ──→ AppointmentsPage
    ├─ POST/PUT/DELETE /api/appointments ──→ useMutation → invalidateQueries(["appointments"])
    ├─ GET /api/patients      ──→ useQuery(["patients", search])     ──→ PatientsPage
    ├─ POST/PUT/DELETE /api/patients     ──→ useMutation → invalidateQueries(["patients"])
    ├─ GET /api/appointments/available-slots ──→ useQuery(["slots", date]) ──→ AppointmentModal
    └─ GET /api/statistics/overview       ──→ fallback: compute client-side from appointments

Zustand (UI state only):
    sidebarOpen, toggleSidebar           ──→ Sidebar component
    modalState: { type, data } | null    ──→ Modal orchestration
```

## Component Tree

```
DashboardLayout
├── Sidebar (navItems, collapsed/expanded, active route highlight)
├── Header (page title auto-detected from pathname, user avatar, notifications)
├── [Page: /dashboard]
│   ├── StatsCard ×4 (appointmentsToday, totalPatients, pendingAppointments, completedRate)
│   └── UpcomingAppointments (list of next 5 appointments)
├── [Page: /dashboard/appointments]
│   ├── Calendar (CSS Grid 7-col, month/week/day views, date-fns navigation)
│   │   └── CalendarCell (appointment dots, today highlight, click→filter)
│   ├── FilterBar (status dropdown, date picker, type dropdown)
│   ├── AppointmentsTable (Table with columns: patient, date, time, type, status, actions)
│   ├── AppointmentModal (react-hook-form + Zod, create/edit modes, AvailableSlots picker)
│   └── ConfirmDialog (delete/confirm action confirmation)
├── [Page: /dashboard/patients]
│   ├── FilterBar (search input with debounce)
│   ├── PatientsTable (columns: name, phone, email, total appointments, actions)
│   ├── PatientModal (react-hook-form + Zod, create/edit)
│   ├── PatientDetailModal (read-only view with appointment history list)
│   └── ConfirmDialog
├── [Page: /dashboard/statistics]
│   ├── StatsCard ×4 (same overview metrics)
│   ├── AppointmentsByMonthChart (Recharts BarChart)
│   ├── AppointmentsByTypeChart (Recharts PieChart)
│   └── CompletionTrendChart (Recharts LineChart)
```

## Hook Contracts

### useAppointments
```typescript
useAppointments(filters?: { status?: AppointmentStatus; date?: string }): {
  appointments: AppointmentListItem[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}
```
Fetches `GET /api/appointments?status=&date=`. Query key: `["appointments", filters]`.

### useAppointmentMutations
```typescript
useAppointmentMutations(): {
  createAppointment:  (data: CreateAppointmentDTO) => Promise<void>
  updateAppointment:  (id: string, data: UpdateAppointmentDTO) => Promise<void>
  deleteAppointment:  (id: string) => Promise<void>
  confirmAppointment: (id: string) => Promise<void>
  cancelAppointment:  (id: string) => Promise<void>
  isCreating: boolean; isUpdating: boolean; isDeleting: boolean
}
```
All mutations invalidate `["appointments"]` on success. Uses `useMutation` + `useQueryClient().invalidateQueries`.

### usePatients
```typescript
usePatients(search?: string): {
  patients: Patient[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}
```
Fetches `GET /api/patients?search=`. Query key: `["patients", search]`. Debounces search by 300ms.

### usePatient
```typescript
usePatient(id: string | null): {
  patient: (Patient & { appointments: Appointment[] }) | null
  isLoading: boolean
  error: Error | null
}
```
Fetches `GET /api/patients/[id]` only when `id` is non-null. Query key: `["patients", id]`.

### usePatientMutations
```typescript
usePatientMutations(): {
  createPatient: (data: CreatePatientDTO) => Promise<void>
  updatePatient: (id: string, data: UpdatePatientDTO) => Promise<void>
  deletePatient: (id: string) => Promise<void>
  isCreating: boolean; isUpdating: boolean; isDeleting: boolean
}
```

### useCalendar
```typescript
useCalendar(view: 'month' | 'week' | 'day'): {
  days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[]
  appointments: AppointmentListItem[]
  viewDate: Date
  navigateNext: () => void
  navigatePrev: () => void
  goToToday: () => void
  setView: (v: 'month' | 'week' | 'day') => void
  isLoading: boolean
}
```
Internal: fetches appointments for visible date range. Computes calendar grid with date-fns (`startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`).

### useAvailableSlots
```typescript
useAvailableSlots(date: string): {
  slots: AvailableSlot[]
  isLoading: boolean
}
```
Fetches `GET /api/appointments/available-slots?date=`. Query key: `["slots", date]`.

### useStatistics
```typescript
useStatistics(): {
  overview: { totalAppointments, totalPatients, appointmentsToday, completionRate }
  byMonth: { month: string; count: number }[]
  byType: { type: string; count: number }[]
  completionTrend: { month: string; rate: number }[]
  isLoading: boolean
}
```
Fetches all appointments (last 12 months), computes aggregations client-side. `/api/statistics/overview` is a placeholder — derive metrics from raw appointment data instead.

## Calendar Algorithm

**Month view**: 7-column CSS Grid (`grid-cols-7`). Row offset = `getDay(startOfMonth(date))` empty cells. Each cell: day number + colored dots for appointments (PENDING=yellow, CONFIRMED=blue, COMPLETED=green, CANCELLED=red). Click cell → filter table by that date.

**Week view**: 7 columns (Mon-Sun), 1 row. Each cell shows appointment list for that day, scrollable with `max-h-32 overflow-y-auto`.

**Day view**: Single column, hourly rows 8:00–18:00 (excluding 13:00 lunch). Appointments positioned absolutely by time offset.

Navigation: `date-fns` `addMonths`, `subMonths`, `addWeeks`, `subWeeks`, `addDays`, `subDays`.

## Responsive Breakpoints

| Breakpoint | Sidebar | Stats Grid | Calendar View | Modals | Charts |
|------------|---------|------------|---------------|--------|--------|
| < 640px (mobile) | hidden, overlay on toggle | 1 col | Day view | Full-screen | 1 col |
| 640–1024px (tablet) | collapsed | 2 cols | Week view | Centered 90% width | 1 col |
| > 1024px (desktop) | expanded | 4 cols | Month view | Centered max-w-lg | 2 cols |

## Accessibility (WCAG 2.1 AA)

- **Calendar**: `role="grid"`, `aria-label` on cells (`"3 citas el 15 de mayo"`), keyboard navigation (←↑→↓ arrows between days), `aria-selected` for focused day
- **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` tied to title, focus trap (tab cycles inside), `Esc` closes, focus returns to trigger button on close
- **Tables**: `role="table"`, proper `<thead>`/`<tbody>`, `aria-sort` on sortable columns, `aria-label` on action icon buttons
- **Forms**: `aria-describedby` linking error messages to inputs, `aria-required="true"` on required fields, `aria-invalid="true"` on validation errors
- **Color**: WCAG AA contrast (Tailwind defaults meet this). Status colors supplemented with icons (not color-only).
- **Toast notifications**: `role="alert"`, `aria-live="polite"` for mutation success/error feedback

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/Sidebar.tsx` | Create | Extracted from layout.tsx inline. Receives navItems, pathname, sidebarOpen, toggle. |
| `src/components/dashboard/Header.tsx` | Create | Extracted from layout.tsx inline. Receives pageTitle, user data. |
| `src/components/ui/Button.tsx` | Create | Base button with variants (primary, secondary, danger, ghost), sizes (sm, md, lg), loading state. |
| `src/components/ui/Input.tsx` | Create | Text input with label, error message, forwardRef for react-hook-form. |
| `src/components/ui/Modal.tsx` | Create | Dialog wrapper with overlay, close button, focus trap, aria-modal. |
| `src/components/ui/Card.tsx` | Create | Card shell with padding, shadow, optional header/footer. |
| `src/components/ui/Table.tsx` | Create | Generic table with sortable headers, loading skeleton, empty state. |
| `src/components/dashboard/Calendar.tsx` | Create | CSS Grid calendar with month/week/day views. Internal useCalendar hook. |
| `src/components/dashboard/StatsCard.tsx` | Create | Metric card: label, value (animated), color accent, optional trend arrow. |
| `src/components/dashboard/AppointmentModal.tsx` | Create | Modal with react-hook-form, Zod validation, patient selector, date picker, available slots. |
| `src/components/dashboard/PatientForm.tsx` | Create | Form fields for patient CRUD (create/edit modes). |
| `src/components/dashboard/PatientDetailModal.tsx` | Create | Read-only modal showing patient info + appointment history table. |
| `src/components/dashboard/FilterBar.tsx` | Create | Horizontal filter bar with dropdowns and search input. |
| `src/components/dashboard/EmptyState.tsx` | Create | Centered illustration + message + CTA for empty lists. |
| `src/components/dashboard/ConfirmDialog.tsx` | Create | "Are you sure?" modal with confirm/cancel, accessible focus trap. |
| `src/hooks/useAppointments.ts` | Create | React Query hook for listing appointments with filters. |
| `src/hooks/useAppointmentMutations.ts` | Create | CRUD + confirm/cancel mutations. |
| `src/hooks/usePatients.ts` | Create | React Query hook for listing patients with search. |
| `src/hooks/usePatient.ts` | Create | React Query hook for single patient with appointment history. |
| `src/hooks/usePatientMutations.ts` | Create | CRUD mutations for patients. |
| `src/hooks/useCalendar.ts` | Create | Calendar navigation + date-range appointment fetching. |
| `src/hooks/useAvailableSlots.ts` | Create | Available slots query for a given date. |
| `src/hooks/useStatistics.ts` | Create | Client-side stats computation from appointments data. |
| `src/app/(dashboard)/dashboard/page.tsx` | Modify | Replace hardcoded stats with real API data via hooks. |
| `src/app/(dashboard)/dashboard/appointments/page.tsx` | Modify | Full appointments page with calendar + table + filter + modal. |
| `src/app/(dashboard)/dashboard/patients/page.tsx` | Modify | Full patients page with search, table, CRUD modals. |
| `src/app/(dashboard)/dashboard/statistics/page.tsx` | Modify | Charts rendered with Recharts from computed stats. |
| `src/app/(dashboard)/layout.tsx` | Modify | Extract inline Sidebar/Header to imported components. Add QueryClientProvider. |
| `package.json` | Modify | Add `date-fns@^3.0`, `recharts@^2.0`. |

## Dependencies to Add

```bash
npm install date-fns recharts
```

Both are tree-shakeable and have no additional peer dependencies beyond React (already installed).

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit: hooks | useCalendar, useStatistics, useAppointments | Jest + React Query testing utils. Mock fetch responses. Verify query keys, cache behavior. |
| Unit: presentational | StatsCard, EmptyState, FilterBar, ConfirmDialog | React Testing Library. Render with props, assert a11y roles, visible text, callback firing. |
| Integration | AppointmentModal + useAppointmentMutations | RTL + mock API. Open modal, fill form, submit, verify mutation called, invalidateQueries triggered. |
| Integration | Calendar navigation | Render calendar, click next month, verify grid recalculates, appointments refetch. |
| A11y audit | All pages | Lighthouse CI with 90+ accessibility threshold per page. Axe-core via jest-axe on components. |
| E2E | Full CRUD flow | Playwright: create patient, create appointment, confirm, cancel, delete. 5 scenarios. |

## Open Questions

- [ ] Should statistics be computed client-side from all appointments (current design) or wait for a real `/api/statistics/overview` endpoint? Current approach works but loads all 12 months of appointments for stats computation.
