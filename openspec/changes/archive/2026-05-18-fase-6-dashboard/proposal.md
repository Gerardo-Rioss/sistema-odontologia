# Proposal: Fase 6 — Dashboard Frontend

## Intent

Las páginas del dashboard existen como placeholders con datos hardcodeados. Los servicios backend (appointments, patients) y sus API routes están completos desde fases anteriores, pero no hay UI que los consuma. El odontólogo no puede gestionar citas, pacientes ni ver estadísticas desde el dashboard. Esta fase convierte todos los placeholders en páginas funcionales usando las APIs existentes.

## Scope

### In Scope
- Dashboard home con tarjetas de métricas reales (citas hoy, pendientes, pacientes totales, completadas) y feed de próximas citas
- Calendario interactivo con vistas mensual/semanal/diaria, renderizado de citas, navegación entre períodos
- Lista de citas con filtros (estado, fecha, tipo) y acciones (confirmar, cancelar, editar, eliminar)
- Modal de creación/edición de citas con validación Zod y selector de slots disponibles
- Gestión de pacientes: lista con búsqueda, formulario CRUD, vista de detalle con historial de citas
- Página de estadísticas con gráficos (citas por mes, distribución por tipo, tasa de cancelación) usando Recharts
- Custom hooks: `useAppointments`, `usePatients`, `useStatistics`, `useCalendar`
- Componentes reutilizables: `Calendar`, `AppointmentModal`, `PatientForm`, `StatsCard`, `FilterBar`, `EmptyState`, `ConfirmDialog`
- WCAG 2.1 AA: roles ARIA, navegación por teclado, focus management, contraste, labels

### Out of Scope
- Cualquier cambio en el backend (APIs existentes consumidas tal cual)
- Drag & drop de citas en el calendario (requiere backend para reschedule por drop)
- Notificaciones en tiempo real (requiere WebSocket/SSE — se pospone)
- Implementación real del endpoint `/api/statistics/overview` (se consume como placeholder; las estadísticas se computan client-side)
- Configuración del consultorio y preferencias de notificación

## Capabilities

### New Capabilities
- `dashboard-ui`: Todas las páginas funcionales del dashboard, componentes reutilizables, custom hooks y gráficos — el contrato completo del frontend

### Modified Capabilities
- None — las APIs backend y sus specs no se modifican

## Approach

Arquitectura client-only sobre Next.js 14 App Router + TypeScript + Tailwind + Zustand. Cada página es un Client Component que consume las API routes existentes vía fetch. Los datos se cachean en estado local con custom hooks (React Query-like pattern manual). Los gráficos usan Recharts (ya está en dependencias). Componentes modulares en `src/components/dashboard/` y hooks en `src/hooks/`. Sin cambios en `layout.tsx` ni en `settings/page.tsx`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(dashboard)/dashboard/page.tsx` | Modified | Datos reales vía fetch + StatsCards + próximas citas |
| `src/app/(dashboard)/dashboard/appointments/page.tsx` | Modified | Lista con filtros + modal CRUD + calendario |
| `src/app/(dashboard)/dashboard/patients/page.tsx` | Modified | Lista con búsqueda + formulario CRUD + detalle |
| `src/app/(dashboard)/dashboard/statistics/page.tsx` | Modified | Gráficos Recharts (bar, pie, line) |
| `src/components/dashboard/` | New | Calendar, AppointmentModal, PatientForm, StatsCard, FilterBar, EmptyState, ConfirmDialog |
| `src/hooks/` | New | useAppointments, usePatients, useStatistics, useCalendar |
| `package.json` | Modified | Agregar `date-fns` (si no está) para formateo de fechas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rendimiento al cargar todas las citas para estadísticas client-side | Medium | Paginación en lista de citas; estadísticas con muestreo de último año |
| Complejidad del calendario interactivo sin librería externa | Medium | Componente custom con CSS Grid + date-fns; si se vuelve inviable, evaluar @fullcalendar en fase posterior |
| WCAG accesibilidad insuficiente en componentes complejos | Low | Checklist WCAG 2.1 AA por componente; lighthouse audit al finalizar |

## Rollback Plan

Cada página se reemplaza como una unidad atómica. Si una página falla, se revierte a su placeholder anterior. Los componentes nuevos no tienen dependencias externas al dashboard — eliminarlos no rompe nada del sistema.

## Dependencies

- `date-fns` (posiblemente ya instalado; verificar)
- `recharts` (verificar en `package.json`)
- APIs de appointments y patients (existentes y funcionales desde fase 3)

## Success Criteria

- [ ] Dashboard home muestra métricas reales (≥0) obtenidas de las APIs
- [ ] Calendario navega entre meses/semanas/días y renderiza citas del backend
- [ ] CRUD de citas completo: crear, editar, confirmar, cancelar, eliminar con feedback visual
- [ ] CRUD de pacientes completo: crear, editar, eliminar, ver historial de citas
- [ ] Página de estadísticas renderiza ≥3 tipos de gráficos con datos reales
- [ ] Lighthouse accessibility score ≥90 en todas las páginas del dashboard
- [ ] Diseño responsive: sidebar colapsable, tablas scrollables, modal full-screen en mobile
