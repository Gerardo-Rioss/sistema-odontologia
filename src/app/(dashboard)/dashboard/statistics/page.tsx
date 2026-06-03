"use client";

import dynamic from "next/dynamic";
import { useStatistics } from "@/hooks/useStatistics";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Spinner } from "@/components/ui/Spinner";
import { CalendarDays, Users, CheckCircle2, XCircle, BarChart3 } from "lucide-react";

/**
 * ChartsSection se importa dinámicamente con ssr: false para excluir
 * Recharts (~200 KB gzipped) del bundle del servidor.
 * Mientras carga, muestra un spinner.
 */
const ChartsSection = dynamic(
  () => import("./ChartsSection").then((mod) => mod.ChartsSection),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    ),
  },
);

// ─── Componente ────────────────────────────────────────────────

/**
 * Página de estadísticas del consultorio.
 *
 * Muestra:
 * - 4 StatsCards con métricas clave.
 * - Gráfico de barras: citas por mes (últimos 12 meses).
 * - Gráfico de torta: distribución por tipo de cita.
 * - Gráfico de líneas: tendencia de tasa de completadas (12 meses).
 * - Estados de carga, vacío y error.
 *
 * Los gráficos Recharts se importan dinámicamente con `next/dynamic`
 * para excluir el módulo del bundle del servidor.
 */
export default function StatisticsPage() {
  const {
    overview,
    appointmentsByMonth,
    byType,
    completionTrend,
    cancellationRate,
    newVsReturning,
    isLoading,
    error,
  } = useStatistics();

  // ── Estado de error ──
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center shadow-sm" role="alert">
          <p className="text-sm font-medium text-destructive">
            Error al cargar estadísticas
          </p>
          <p className="mt-1 text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // ── Estado de carga ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // ── Sin datos ──
  const hasData = overview.totalAppointments > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Sin datos suficientes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registrá citas para comenzar a ver estadísticas del consultorio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>

      {/* ── Stats Cards Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<CalendarDays className="h-6 w-6" />}
          label="Citas totales (12m)"
          value={overview.totalAppointments}
          accent="blue"
        />
        <StatsCard
          icon={<Users className="h-6 w-6" />}
          label="Pacientes registrados"
          value={overview.totalPatients}
          accent="green"
        />
        <StatsCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          label="Tasa de completadas"
          value={`${overview.completionRate}%`}
          accent="purple"
          trend={{
            value: overview.completionRate,
            direction: overview.completionRate >= 50 ? "up" : "down",
          }}
        />
        <StatsCard
          icon={<XCircle className="h-6 w-6" />}
          label="Tasa de cancelación"
          value={`${cancellationRate}%`}
          accent="red"
          trend={{
            value: cancellationRate,
            direction: cancellationRate <= 20 ? "down" : "up",
            label: "vs. total",
          }}
        />
      </div>

      {/* Nuevos vs recurrentes (mini cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Pacientes nuevos</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {newVsReturning.newPatients}
          </p>
          <p className="text-xs text-muted-foreground">Con 1 sola cita en 12 meses</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Pacientes recurrentes</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {newVsReturning.returningPatients}
          </p>
          <p className="text-xs text-muted-foreground">Con 2 o más citas en 12 meses</p>
        </div>
      </div>

      {/* ── Gráficos (carga dinámica del cliente) ── */}
      <ChartsSection
        appointmentsByMonth={appointmentsByMonth}
        byType={byType}
        completionTrend={completionTrend}
      />
    </div>
  );
}
