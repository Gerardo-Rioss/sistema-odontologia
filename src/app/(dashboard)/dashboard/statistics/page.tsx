"use client";

import dynamic from "next/dynamic";
import { useStatistics } from "@/hooks/useStatistics";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Spinner } from "@/components/ui/Spinner";

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

// ─── Íconos SVG inline ─────────────────────────────────────────

const CalendarIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PeopleIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CheckIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CancelIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
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
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <div className="rounded-xl bg-red-50 p-6 text-center shadow-sm dark:bg-red-950" role="alert">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Error al cargar estadísticas
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // ── Estado de carga ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-900">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">
            Sin datos suficientes
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Registrá citas para comenzar a ver estadísticas del consultorio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>

      {/* ── Stats Cards Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={CalendarIcon}
          label="Citas totales (12m)"
          value={overview.totalAppointments}
          accent="blue"
        />
        <StatsCard
          icon={PeopleIcon}
          label="Pacientes registrados"
          value={overview.totalPatients}
          accent="green"
        />
        <StatsCard
          icon={CheckIcon}
          label="Tasa de completadas"
          value={`${overview.completionRate}%`}
          accent="purple"
          trend={{
            value: overview.completionRate,
            direction: overview.completionRate >= 50 ? "up" : "down",
          }}
        />
        <StatsCard
          icon={CancelIcon}
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
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pacientes nuevos</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {newVsReturning.newPatients}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Con 1 sola cita en 12 meses</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pacientes recurrentes</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {newVsReturning.returningPatients}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Con 2 o más citas en 12 meses</p>
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
