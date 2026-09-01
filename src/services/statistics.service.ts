import { subMonths } from "date-fns";
import type { IStatisticsRepository } from "./types";
import { statisticsRepository } from "@/repositories/statistics.repository";

// ─── Types ────────────────────────────────────────────────────

export interface StatsOverview {
  totalAppointments: number;
  totalPatients: number;
  appointmentsToday: number;
  completionRate: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface TypeData {
  type: string;
  count: number;
}

export interface StatusData {
  status: string;
  count: number;
}

export interface CompletionTrendPoint {
  month: string;
  rate: number;
}

interface StatisticsReturn {
  overview: StatsOverview;
  appointmentsByMonth: MonthlyData[];
  byType: TypeData[];
  byStatus: StatusData[];
  completionTrend: CompletionTrendPoint[];
  cancellationRate: number;
  newVsReturning: { newPatients: number; returningPatients: number };
  isLoading: boolean;
  error: string | null;
}

// ─── Labels ───────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  LIMPIEZA: "Limpieza",
  REVISION: "Revisión",
  URGENCIA: "Urgencia",
  TRATAMIENTO: "Tratamiento",
  OTRO: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

// ─── Month Helpers ────────────────────────────────────────────

/**
 * Generates 12-month keys (YYYY-MM) from oldest to newest.
 */
function generateMonthKeys(): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
  }
  return keys;
}

/**
 * Formats a YYYY-MM key to Spanish month label using Intl.DateTimeFormat.
 * Uses a date-only constructor to avoid timezone shifts.
 */
function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  }).format(date);
}

// ─── Service ──────────────────────────────────────────────────

/**
 * Server-side statistics service.
 *
 * Calls repository for raw data, transforms into the StatisticsReturn shape
 * matching the existing client-side hook interface.
 */
export class StatisticsService {
  constructor(private readonly statsRepo: IStatisticsRepository) {}

  async getOverview(userId: string): Promise<StatisticsReturn> {
    const cutoff = subMonths(new Date(), 12);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      counts,
      totalPatients,
      rawByMonth,
      rawByType,
      rawByStatus,
      patientCounts,
    ] = await Promise.all([
      this.statsRepo.getCounts(userId, cutoff, today),
      this.statsRepo.getTotalPatients(userId),
      this.statsRepo.getByMonth(userId, cutoff),
      this.statsRepo.getByType(userId, cutoff),
      this.statsRepo.getByStatus(userId, cutoff),
      this.statsRepo.getPatientAppointmentCounts(userId, cutoff),
    ]);

    const monthKeys = generateMonthKeys();
    const monthCountMap = new Map(rawByMonth.map((m) => [m.month, m.count]));

    // ── Overview ──
    const overview: StatsOverview = {
      totalAppointments: counts.totalAppointments,
      totalPatients,
      appointmentsToday: counts.appointmentsToday,
      completionRate:
        counts.totalAppointments > 0
          ? Math.round((counts.completedCount / counts.totalAppointments) * 100)
          : 0,
    };

    // ── appointmentsByMonth ──
    const appointmentsByMonth: MonthlyData[] = monthKeys.map((key) => ({
      month: formatMonthLabel(key),
      count: monthCountMap.get(key) ?? 0,
    }));

    // ── byType ──
    const byType: TypeData[] = rawByType.map((r) => ({
      type: TYPE_LABELS[r.type] ?? r.type,
      count: r.count,
    }));

    // ── byStatus ──
    const byStatus: StatusData[] = rawByStatus.map((r) => ({
      status: STATUS_LABELS[r.status] ?? r.status,
      count: r.count,
    }));

    // ── completionTrend ──
    // Uses overall completion rate for months that have data.
    // Per-month accuracy requires a dedicated repository query (future optimization).
    const overallRate =
      counts.totalAppointments > 0
        ? Math.round((counts.completedCount / counts.totalAppointments) * 100)
        : 0;

    const completionTrend: CompletionTrendPoint[] = monthKeys.map((key) => ({
      month: formatMonthLabel(key),
      rate: (monthCountMap.get(key) ?? 0) > 0 ? overallRate : 0,
    }));

    // ── cancellationRate ──
    const cancelledCount =
      rawByStatus.find((r) => r.status === "CANCELLED")?.count ?? 0;
    const cancellationRate =
      counts.totalAppointments > 0
        ? Math.round((cancelledCount / counts.totalAppointments) * 100)
        : 0;

    // ── newVsReturning ──
    const newPatients = patientCounts.filter((p) => p.count === 1).length;
    const returningPatients = patientCounts.length - newPatients;

    return {
      overview,
      appointmentsByMonth,
      byType,
      byStatus,
      completionTrend,
      cancellationRate,
      newVsReturning: { newPatients, returningPatients },
      isLoading: false,
      error: null,
    };
  }
}

/** Singleton instance of the statistics service. */
export const statisticsService = new StatisticsService(statisticsRepository);
