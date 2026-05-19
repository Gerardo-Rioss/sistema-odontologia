'use client';

import { useMemo } from 'react';
import { format, subMonths, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import type { AppointmentStatus, AppointmentType } from '@/types';

// ─── Types ────────────────────────────────────────────────────

export interface StatsOverview {
  /** Total de citas en el período (últimos 12 meses). */
  totalAppointments: number;
  /** Total de pacientes registrados. */
  totalPatients: number;
  /** Citas para el día de hoy. */
  appointmentsToday: number;
  /** Porcentaje de citas completadas del total en el período. */
  completionRate: number;
}

export interface MonthlyData {
  /** Etiqueta del mes (ej: "Ene 2026"). */
  month: string;
  /** Cantidad de citas en ese mes. */
  count: number;
}

export interface TypeData {
  /** Tipo de cita. */
  type: string;
  /** Cantidad de citas de ese tipo. */
  count: number;
}

export interface StatusData {
  /** Estado de la cita. */
  status: string;
  /** Cantidad de citas con ese estado. */
  count: number;
}

export interface CompletionTrendPoint {
  /** Etiqueta del mes. */
  month: string;
  /** Tasa de completadas en ese mes (0–100). */
  rate: number;
}

interface StatisticsReturn {
  overview: StatsOverview;
  appointmentsByMonth: MonthlyData[];
  byType: TypeData[];
  byStatus: StatusData[];
  completionTrend: CompletionTrendPoint[];
  /** Tasa de cancelación global (0–100). */
  cancellationRate: number;
  /** Distribución nuevos vs recurrentes (nuevos = 1 cita en el período). */
  newVsReturning: { newPatients: number; returningPatients: number };
  isLoading: boolean;
  error: string | null;
}

// ─── Labels ───────────────────────────────────────────────────

const TYPE_LABELS: Record<AppointmentType, string> = {
  LIMPIEZA: 'Limpieza',
  REVISION: 'Revisión',
  URGENCIA: 'Urgencia',
  TRATAMIENTO: 'Tratamiento',
  OTRO: 'Otro',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
};

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Hook de estadísticas — computa métricas del dashboard cliente-side
 * a partir de los datos crudos de citas y pacientes.
 *
 * Todos los cálculos están memoizados con useMemo. El período de análisis
 * son los últimos 12 meses a partir de hoy.
 */
export function useStatistics(): StatisticsReturn {
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments();

  const {
    data: patients = [],
    isLoading: patientsLoading,
    error: patientsError,
  } = usePatients();

  const isLoading = appointmentsLoading || patientsLoading;
  const error =
    appointmentsError?.message ?? patientsError?.message ?? null;

  // ── Fecha de corte: 12 meses atrás ──
  const cutoffDate = useMemo(() => subMonths(new Date(), 12), []);

  // ── Filtrar citas de los últimos 12 meses ──
  const recentAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return !isBefore(d, cutoffDate);
      }),
    [appointments, cutoffDate],
  );

  // ── Overview ──
  const overview = useMemo<StatsOverview>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayCount = appointments.filter(
      (a) => format(new Date(a.date), 'yyyy-MM-dd') === today,
    ).length;

    const total = recentAppointments.length;
    const completed = recentAppointments.filter(
      (a) => a.status === 'COMPLETED',
    ).length;

    return {
      totalAppointments: total,
      totalPatients: patients.length,
      appointmentsToday: todayCount,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [recentAppointments, patients, appointments]);

  // ── appointmentsByMonth ──
  const appointmentsByMonth = useMemo<MonthlyData[]>(() => {
    const months: MonthlyData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      const label = format(date, 'MMM yyyy', { locale: es });
      const count = recentAppointments.filter(
        (a) => format(new Date(a.date), 'yyyy-MM') === key,
      ).length;
      months.push({ month: label, count });
    }
    return months;
  }, [recentAppointments]);

  // ── byType ──
  const byType = useMemo<TypeData[]>(() => {
    const counts: Record<string, number> = {};
    for (const a of recentAppointments) {
      const label = TYPE_LABELS[a.type];
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [recentAppointments]);

  // ── byStatus ──
  const byStatus = useMemo<StatusData[]>(() => {
    const counts: Record<string, number> = {};
    for (const a of recentAppointments) {
      const label = STATUS_LABELS[a.status];
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
    }));
  }, [recentAppointments]);

  // ── completionTrend ──
  const completionTrend = useMemo<CompletionTrendPoint[]>(() => {
    const points: CompletionTrendPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      const label = format(date, 'MMM yyyy', { locale: es });
      const monthApps = recentAppointments.filter(
        (a) => format(new Date(a.date), 'yyyy-MM') === key,
      );
      const completed = monthApps.filter((a) => a.status === 'COMPLETED').length;
      points.push({
        month: label,
        rate: monthApps.length > 0 ? Math.round((completed / monthApps.length) * 100) : 0,
      });
    }
    return points;
  }, [recentAppointments]);

  // ── cancellationRate ──
  const cancellationRate = useMemo(() => {
    const total = recentAppointments.length;
    const cancelled = recentAppointments.filter(
      (a) => a.status === 'CANCELLED',
    ).length;
    return total > 0 ? Math.round((cancelled / total) * 100) : 0;
  }, [recentAppointments]);

  // ── newVsReturning ──
  const newVsReturning = useMemo(() => {
    const patientAppointmentCounts: Record<string, number> = {};
    for (const a of recentAppointments) {
      patientAppointmentCounts[a.patientId] =
        (patientAppointmentCounts[a.patientId] ?? 0) + 1;
    }
    const newPatients = Object.values(patientAppointmentCounts).filter(
      (c) => c === 1,
    ).length;
    const returningPatients =
      Object.keys(patientAppointmentCounts).length - newPatients;
    return { newPatients, returningPatients };
  }, [recentAppointments]);

  return {
    overview,
    appointmentsByMonth,
    byType,
    byStatus,
    completionTrend,
    cancellationRate,
    newVsReturning,
    isLoading,
    error,
  };
}
