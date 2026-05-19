'use client';

import { useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
  isSameDay,
} from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { useStore, type CalendarView } from '@/store/useStore';
import type { AppointmentListItem, AppointmentType } from '@/types';

// ─── Types ────────────────────────────────────────────────────

export interface CalendarDay {
  /** Fecha completa de esta celda. */
  date: Date;
  /** Si pertenece al mes actual (para atenuar celdas de meses adyacentes). */
  isCurrentMonth: boolean;
  /** Si es el día de hoy. */
  isToday: boolean;
  /** Citas asignadas a este día. */
  appointments: AppointmentListItem[];
  /** Tipos de cita únicos en este día (para los puntitos de color). */
  types: AppointmentType[];
}

interface CalendarReturn {
  /** Arreglo de días que componen la grilla actual. */
  days: CalendarDay[];
  /** Citas del rango visible (todas, sin agrupar). */
  appointments: AppointmentListItem[];
  /** Fecha de referencia actual del calendario. */
  viewDate: Date;
  /** Vista activa (month, week, day). */
  currentView: CalendarView;

  /** Navegar al período siguiente. */
  goToNext: () => void;
  /** Navegar al período anterior. */
  goToPrev: () => void;
  /** Volver a la fecha de hoy con vista mensual. */
  goToToday: () => void;
  /** Cambiar la vista activa (month, week, day). */
  setView: (view: CalendarView) => void;

  /** Estado de carga. */
  isLoading: boolean;
  /** Error de carga. */
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Genera la grilla de días para la vista mensual.
 * Incluye celdas de relleno para completar la semana de inicio y fin.
 */
function buildMonthGrid(
  date: Date,
  appointments: AppointmentListItem[],
): CalendarDay[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return days.map((day) => {
    const dayAppointments = appointments.filter((a) =>
      isSameDay(new Date(a.date), day),
    );
    const types = [
      ...new Set(dayAppointments.map((a) => a.type)),
    ] as AppointmentType[];

    return {
      date: day,
      isCurrentMonth: day >= monthStart && day <= monthEnd,
      isToday: isSameDay(day, new Date()),
      appointments: dayAppointments,
      types,
    };
  });
}

/**
 * Genera la grilla de días para la vista semanal (Lun–Dom).
 */
function buildWeekGrid(
  date: Date,
  appointments: AppointmentListItem[],
): CalendarDay[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return days.map((day) => {
    const dayAppointments = appointments.filter((a) =>
      isSameDay(new Date(a.date), day),
    );
    const types = [
      ...new Set(dayAppointments.map((a) => a.type)),
    ] as AppointmentType[];

    return {
      date: day,
      isCurrentMonth: true, // todas las celdas de la semana son "actuales"
      isToday: isSameDay(day, new Date()),
      appointments: dayAppointments,
      types,
    };
  });
}

/**
 * Genera una grilla de un solo día (vista diaria).
 */
function buildDayGrid(
  date: Date,
  appointments: AppointmentListItem[],
): CalendarDay[] {
  const dayAppointments = appointments.filter((a) =>
    isSameDay(new Date(a.date), date),
  );
  const types = [
    ...new Set(dayAppointments.map((a) => a.type)),
  ] as AppointmentType[];

  return [
    {
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, new Date()),
      appointments: dayAppointments,
      types,
    },
  ];
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Hook de calendario que combina React Query (datos) con Zustand (UI state).
 *
 * Recupera las citas del rango visible según la vista activa (month/week/day)
 * y las agrupa por día para renderizar la grilla del calendario.
 */
export function useCalendar(): CalendarReturn {
  const currentView = useStore((s) => s.currentView);
  const currentDate = useStore((s) => s.currentDate);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const goToTodayStore = useStore((s) => s.goToToday);

  const viewDate = useMemo(() => new Date(currentDate), [currentDate]);

  // Determinar el rango de fechas a consultar según la vista
  const { dateStart, dateEnd } = useMemo(() => {
    if (currentView === 'month') {
      const ws = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
      const we = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
      return {
        dateStart: format(ws, 'yyyy-MM-dd'),
        dateEnd: format(we, 'yyyy-MM-dd'),
      };
    }
    if (currentView === 'week') {
      const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
      const we = endOfWeek(viewDate, { weekStartsOn: 1 });
      return {
        dateStart: format(ws, 'yyyy-MM-dd'),
        dateEnd: format(we, 'yyyy-MM-dd'),
      };
    }
    // day
    return {
      dateStart: format(viewDate, 'yyyy-MM-dd'),
      dateEnd: format(viewDate, 'yyyy-MM-dd'),
    };
  }, [currentView, viewDate]);

  // Cargar todas las citas del rango (sin filtro de fecha exacto — se filtran en cliente)
  const { data: appointments = [], isLoading, error } = useAppointments();

  // Construir la grilla según la vista activa
  const days = useMemo(() => {
    const rangeAppointments = appointments.filter((a) => {
      const d = format(new Date(a.date), 'yyyy-MM-dd');
      return d >= dateStart && d <= dateEnd;
    });

    if (currentView === 'month') return buildMonthGrid(viewDate, rangeAppointments);
    if (currentView === 'week') return buildWeekGrid(viewDate, rangeAppointments);
    return buildDayGrid(viewDate, rangeAppointments);
  }, [currentView, viewDate, appointments, dateStart, dateEnd]);

  // Navegación
  const goToNext = useCallback(() => {
    let next: Date;
    if (currentView === 'month') next = addMonths(viewDate, 1);
    else if (currentView === 'week') next = addWeeks(viewDate, 1);
    else next = addDays(viewDate, 1);
    setCurrentDate(format(next, 'yyyy-MM-dd'));
  }, [currentView, viewDate, setCurrentDate]);

  const goToPrev = useCallback(() => {
    let prev: Date;
    if (currentView === 'month') prev = subMonths(viewDate, 1);
    else if (currentView === 'week') prev = subWeeks(viewDate, 1);
    else prev = subDays(viewDate, 1);
    setCurrentDate(format(prev, 'yyyy-MM-dd'));
  }, [currentView, viewDate, setCurrentDate]);

  const goToTodayFn = useCallback(() => {
    goToTodayStore();
  }, [goToTodayStore]);

  const setViewFn = useCallback(
    (view: CalendarView) => setCurrentView(view),
    [setCurrentView],
  );

  return {
    days,
    appointments,
    viewDate,
    currentView,
    goToNext,
    goToPrev,
    goToToday: goToTodayFn,
    setView: setViewFn,
    isLoading,
    error: error?.message ?? null,
  };
}
