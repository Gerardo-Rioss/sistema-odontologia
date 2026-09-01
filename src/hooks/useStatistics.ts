'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';

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

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchStatistics(): Promise<StatisticsReturn> {
  const res = await fetch('/api/statistics/overview');

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar estadísticas');
  }

  const json: ApiResponse<StatisticsReturn> = await res.json();
  // Server returns { success, data } where data has isLoading/error from the service
  // Strip those server-side fields and add client-side loading state
  const data = json.data!;
  return {
    overview: data.overview,
    appointmentsByMonth: data.appointmentsByMonth,
    byType: data.byType,
    byStatus: data.byStatus,
    completionTrend: data.completionTrend,
    cancellationRate: data.cancellationRate,
    newVsReturning: data.newVsReturning,
    isLoading: false,
    error: null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Hook de estadísticas — fetches metrics from server-side API endpoint.
 *
 * Replaces client-side computation (9 useMemo + full data fetch) with a
 * single server-side aggregation. Same StatisticsReturn interface for
 * backward compatibility with dashboard consumers.
 *
 * staleTime: 30s — datos frescos durante 30 segundos.
 */
export function useStatistics(): StatisticsReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistics-overview'],
    queryFn: fetchStatistics,
    staleTime: 30_000,
    // Provide default empty shape while loading
    placeholderData: (prev) => prev,
  });

  if (isLoading) {
    return {
      overview: { totalAppointments: 0, totalPatients: 0, appointmentsToday: 0, completionRate: 0 },
      appointmentsByMonth: [],
      byType: [],
      byStatus: [],
      completionTrend: [],
      cancellationRate: 0,
      newVsReturning: { newPatients: 0, returningPatients: 0 },
      isLoading: true,
      error: null,
    };
  }

  if (error) {
    return {
      overview: { totalAppointments: 0, totalPatients: 0, appointmentsToday: 0, completionRate: 0 },
      appointmentsByMonth: [],
      byType: [],
      byStatus: [],
      completionTrend: [],
      cancellationRate: 0,
      newVsReturning: { newPatients: 0, returningPatients: 0 },
      isLoading: false,
      error: error.message,
    };
  }

  return data ?? {
    overview: { totalAppointments: 0, totalPatients: 0, appointmentsToday: 0, completionRate: 0 },
    appointmentsByMonth: [],
    byType: [],
    byStatus: [],
    completionTrend: [],
    cancellationRate: 0,
    newVsReturning: { newPatients: 0, returningPatients: 0 },
    isLoading: false,
    error: null,
  };
}
