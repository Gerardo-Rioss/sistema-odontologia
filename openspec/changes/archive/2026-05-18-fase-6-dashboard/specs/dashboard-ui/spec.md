# dashboard-ui Specification

## Purpose

Client-only Next.js 14 dashboard consuming `/api/appointments` and `/api/patients`. WCAG 2.1 AA required.

## Requirements

| # | Requirement | Source | Coverage |
|---|------------|--------|----------|
| R1 | Dashboard Home: metrics + upcoming feed | `/api/appointments`, `/api/patients` | load, empty, error |
| R2 | Calendar: month/week/day, color-coded by type | `/api/appointments` | nav, empty-day, view-switch |
| R3 | Appointment List: filters + inline actions | `/api/appointments` | filter, empty, confirm, delete |
| R4 | Appointment Modal: create/edit + Zod + slots | `/api/appointments`, `/api/patients`, `/api/appointments/available-slots` | valid, validation-error, slot-occupied, edit |
| R5 | Patient List: search + CRUD | `/api/patients` | search, delete-cascade, create |
| R6 | Patient Detail: info + history | `/api/patients/[id]` | loaded, 404 |
| R7 | Statistics: bar/pie/line charts | `/api/appointments` (client-computed) | data, zero-data |
| R8 | Responsive: sidebar collapse <768px, scrollable tables, full-screen modals | viewport breakpoints | mobile, desktop |
| R9 | Accessibility: keyboard nav, ARIA, focus trap, 4.5:1 contrast | all components | kb-nav, focus-trap, screen-reader, contrast |

All components SHALL render **loading** (skeleton/spinner), **empty** (icon + message), and **error** (message + retry).

### Requirement: Dashboard Home (R1)

The home page SHALL render 4 StatsCard metrics and next 5 upcoming appointments.

#### Scenario: Loads successfully
- GIVEN authenticated session
- WHEN `/dashboard` renders
- THEN 4 stat cards display real counts; upcoming feed shows 5 PENDING/CONFIRMED appointments sorted by date

#### Scenario: API fails
- GIVEN `/api/appointments` returns 500
- THEN failed cards show error state + "Reintentar" button; unaffected cards remain

#### Scenario: No upcoming appointments
- GIVEN zero upcoming appointments
- THEN feed renders "No hay citas próximas" empty state

### Requirement: Appointment Calendar (R2)

Calendar SHALL support month/week/day views. Type colors: LIMPIEZA=green, REVISION=blue, URGENCIA=red, TRATAMIENTO=yellow, OTRO=gray.

#### Scenario: Month view with appointments
- GIVEN appointments exist in current month
- WHEN calendar renders month grid
- THEN day cells show colored dots per type; empty days render clean

#### Scenario: Navigate periods
- GIVEN calendar at June 2026
- WHEN user clicks prev/next or "Today"
- THEN view shifts to target period; appointments reload

#### Scenario: Week/day view
- GIVEN month view active
- WHEN user selects "Semana" or "Día"
- THEN grid switches to hourly layout with appointment blocks at correct times

### Requirement: Appointment List (R3)

List SHALL filter by status, date, type and expose confirm, cancel, edit, delete per row.

#### Scenario: Filter by status
- GIVEN 5 PENDING + 3 CONFIRMED
- WHEN user selects PENDING filter
- THEN list shows only PENDING rows; count badge updates

#### Scenario: Empty filter result
- GIVEN zero CANCELLED appointments
- WHEN user filters status=CANCELLED
- THEN EmptyState: "No se encontraron citas"

#### Scenario: Confirm inline
- GIVEN PENDING row
- WHEN user clicks "Confirmar"
- THEN PATCH confirm; status updates to CONFIRMED; list refreshes

#### Scenario: Delete with confirmation
- WHEN user clicks delete on any row
- THEN ConfirmDialog: "¿Eliminar esta cita?"; Cancel aborts; Confirm deletes + toast

### Requirement: Appointment Modal (R4)

Modal SHALL validate via Zod, search patients, and restrict time slots to available from API.

#### Scenario: Create valid
- GIVEN patient=selected, date=2026-06-15, time=10:00, type=LIMPIEZA
- WHEN "Guardar" clicked
- THEN POST 201; modal closes; calendar and list refresh

#### Scenario: Validation error
- GIVEN empty patient field
- WHEN form submitted
- THEN inline error "Paciente es requerido"; API not called

#### Scenario: Slot occupied
- GIVEN 10:00 booked on 2026-06-15
- WHEN user selects that date
- THEN available-slots dropdown excludes "10:00"

#### Scenario: Edit existing
- GIVEN modal opened for existing appointment
- WHEN user changes type and submits
- THEN PUT updates; modal closes; list reflects change

### Requirement: Patient List (R5)

Patient list SHALL support text search and CRUD via PatientForm.

#### Scenario: Search by name
- GIVEN "María López" and "Carlos Ruiz"
- WHEN user types "mar"
- THEN list shows only "María López"

#### Scenario: Delete with cascade warning
- GIVEN patient has 3 appointments
- WHEN delete clicked
- THEN dialog warns "Se eliminarán también 3 citas"; confirm triggers DELETE cascade

#### Scenario: Create minimal patient
- GIVEN name="Nuevo", phone="555-0101"
- WHEN form submitted
- THEN POST 201; list refreshes with new row

### Requirement: Patient Detail (R6)

Detail page SHALL show patient info + appointment history from `GET /api/patients/[id]`.

#### Scenario: View detail
- GIVEN patient "p1" with 2 appointments
- WHEN navigating to `/dashboard/patients/p1`
- THEN renders info card + history table sorted by date descending

#### Scenario: Not found / forbidden
- GIVEN patient ID 999 (nonexistent or other dentist's)
- THEN renders "Paciente no encontrado" with back link

### Requirement: Statistics Dashboard (R7)

Statistics SHALL render bar (monthly), pie (type distribution), and line (cancellation rate) charts from client-computed appointment data.

#### Scenario: Charts with data
- GIVEN 12 months of appointments
- WHEN `/dashboard/statistics` renders
- THEN 3 charts display with correct values

#### Scenario: Zero data
- GIVEN zero appointments in database
- THEN each chart area shows "Sin datos suficientes" empty state; no broken charts

### Requirement: Responsive Layout (R8)

Layout SHALL collapse sidebar at <768px, scroll tables, full-screen modals on mobile.

#### Scenario: Mobile ≤375px
- GIVEN viewport 375px
- THEN sidebar hidden; hamburger toggle opens overlay sidebar; tables scroll horizontally; modals full-screen

#### Scenario: Desktop ≥768px
- GIVEN viewport 1024px
- THEN sidebar visible fixed; tables render full width

### Requirement: Accessibility (R9)

All components SHALL be keyboard-navigable, use ARIA labels, trap modal focus, meet 4.5:1 contrast.

#### Scenario: Keyboard calendar nav
- GIVEN calendar focused
- WHEN Arrow keys pressed
- THEN focus moves between day cells; Enter opens detail; Tab moves to nav

#### Scenario: Modal focus trap
- GIVEN modal open
- WHEN Tab cycles focus
- THEN focus stays inside modal; Escape closes + restores focus to trigger

#### Scenario: Screen reader
- GIVEN screen reader active
- THEN all interactive elements announce role, label, state via ARIA

#### Scenario: Color contrast
- GIVEN colored type badges
- THEN text-on-badge meets 4.5:1 ratio; color not sole differentiator (icons present)
