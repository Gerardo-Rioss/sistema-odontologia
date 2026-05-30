"use client";

import Link from "next/link";
import { useStatistics } from "@/hooks/useStatistics";
import { useAppointments } from "@/hooks/useAppointments";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

const MoneyIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

// ─── Componente ────────────────────────────────────────────────

/**
 * Página principal del dashboard.
 * Muestra métricas clave (4 StatsCards), las últimas 5 citas,
 * y botones de acción rápida.
 */
export default function DashboardPage() {
  const { overview, isLoading: statsLoading, error: statsError } = useStatistics();
  const {
    data: allAppointments = [],
    isLoading: appsLoading,
    error: appsError,
  } = useAppointments();

  // ── Estado de error general ──
  if (statsError) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center shadow-sm dark:bg-red-950" role="alert">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Error al cargar estadísticas
        </p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{statsError}</p>
      </div>
    );
  }

  // ── Últimas 5 citas ──
  const recentAppointments = [...allAppointments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel Principal</h1>

      {/* ── Stats Cards Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={CalendarIcon}
          label="Citas hoy"
          value={overview.appointmentsToday}
          accent="blue"
          loading={statsLoading}
        />
        <StatsCard
          icon={PeopleIcon}
          label="Pacientes nuevos"
          value={overview.totalPatients}
          accent="green"
          loading={statsLoading}
        />
        <StatsCard
          icon={MoneyIcon}
          label="Tasa de completadas"
          value={`${overview.completionRate}%`}
          accent="purple"
          loading={statsLoading}
          trend={{
            value: overview.completionRate,
            direction: overview.completionRate >= 50 ? "up" : "down",
          }}
        />
        <StatsCard
          icon={AlertIcon}
          label="Tasa de cancelación"
          value={`${overview.completionRate > 0 ? Math.round((100 - overview.completionRate) / 2) : 0}%`}
          accent="red"
          loading={statsLoading}
        />
      </div>

      {/* ── Recent Appointments + Quick Actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimas citas — ocupa 2/3 en desktop */}
        <div className="lg:col-span-2">
          <Card
            header={
              <h2 className="text-lg font-semibold text-gray-900">
                Próximas citas
              </h2>
            }
          >
            {appsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : appsError ? (
              <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-950" role="alert">
                <p className="text-sm text-red-600 dark:text-red-400">{appsError.message}</p>
              </div>
            ) : (
              <AppointmentList
                appointments={recentAppointments}
                isLoading={false}
              />
            )}
          </Card>
        </div>

        {/* Acciones rápidas — ocupa 1/3 en desktop */}
        <div>
          <Card
            header={
              <h2 className="text-lg font-semibold text-gray-900">
                Acciones rápidas
              </h2>
            }
          >
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/appointments">
                <Button variant="primary" size="md" className="w-full justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva cita
                </Button>
              </Link>
              <Link href="/dashboard/patients">
                <Button variant="secondary" size="md" className="w-full justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Nuevo paciente
                </Button>
              </Link>
              <Link href="/dashboard/statistics">
                <Button variant="ghost" size="md" className="w-full justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Ver estadísticas
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
