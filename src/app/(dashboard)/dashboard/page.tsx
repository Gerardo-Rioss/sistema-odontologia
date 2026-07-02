"use client";

import Link from "next/link";
import { useStatistics } from "@/hooks/useStatistics";
import { useAppointments } from "@/hooks/useAppointments";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, DollarSign, AlertTriangle, Plus, UserPlus, BarChart3 } from "lucide-react";

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

  if (statsError) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center shadow-sm" role="alert">
        <p className="text-sm font-medium text-destructive">
          Error al cargar estadísticas
        </p>
        <p className="mt-1 text-sm text-destructive">{statsError}</p>
      </div>
    );
  }

  const recentAppointments = [...allAppointments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel Principal</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-onboarding="stats">
        <StatsCard
          icon={<CalendarDays className="h-6 w-6" />}
          label="Citas hoy"
          value={overview.appointmentsToday}
          accent="blue"
          loading={statsLoading}
        />
        <StatsCard
          icon={<Users className="h-6 w-6" />}
          label="Pacientes nuevos"
          value={overview.totalPatients}
          accent="green"
          loading={statsLoading}
        />
        <StatsCard
          icon={<DollarSign className="h-6 w-6" />}
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
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Tasa de cancelación"
          value={`${overview.completionRate > 0 ? Math.round((100 - overview.completionRate) / 2) : 0}%`}
          accent="red"
          loading={statsLoading}
        />
      </div>

      {/* Recent Appointments + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimas citas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Próximas citas</h2>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : appsError ? (
                <div className="rounded-lg bg-destructive/10 p-4 text-center" role="alert">
                  <p className="text-sm text-destructive">{appsError.message}</p>
                </div>
              ) : (
                <AppointmentList appointments={recentAppointments} isLoading={false} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Acciones rápidas</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Link href="/dashboard/appointments">
                                  <Button className="w-full" data-onboarding="new-appointment">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva cita
                  </Button>
                </Link>
                <Link href="/dashboard/patients">
                  <Button variant="secondary" className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo paciente
                  </Button>
                </Link>
                <Link href="/dashboard/statistics">
                  <Button variant="ghost" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver estadísticas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
