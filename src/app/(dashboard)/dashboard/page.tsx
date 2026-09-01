"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStatistics } from "@/hooks/useStatistics";
import { useAppointments } from "@/hooks/useAppointments";
import { useStore } from "@/store/useStore";
import { dateKeyOf } from "@/lib/formatters";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, CheckCircle2, AlertTriangle, Plus, UserPlus, BarChart3, ArrowRight } from "lucide-react";

/**
 * Página principal del dashboard.
 * Muestra saludo, métricas clave, últimas citas y acciones rápidas.
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const { overview, appointmentsByMonth, completionTrend, isLoading: statsLoading, error: statsError } = useStatistics();
  const { data: allAppointments = [], isLoading: appsLoading, error: appsError } = useAppointments();

  // Series para mini-sparklines (datos reales de los últimos 12 meses)
  const monthlyCounts = useMemo(
    () => appointmentsByMonth.map((m) => m.count),
    [appointmentsByMonth]
  );
  const completionSeries = useMemo(
    () => completionTrend.map((t) => t.rate),
    [completionTrend]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  // Primer nombre real, ignorando títulos (Dr., Dra., Lic., etc.)
  const firstName = useMemo(() => {
    const raw = user?.name?.trim() ?? "";
    if (!raw) return "";
    const parts = raw.split(/\s+/);
    const titles = /^(dr|dra|lic|ing|prof)\.?$/i;
    const first = parts[0];
    const second = parts[1];
    if (titles.test(first) && second) return second;
    return first;
  }, [user?.name]);

  const monthYearLabel = useMemo(() =>
    new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
  []);

  // Próximas citas: TODAS las de hoy (aunque la hora ya pasó — el odontólogo
  // quiere ver la agenda del día completa) + las futuras, ordenadas por
  // proximidad (hoy primero por hora, después los días siguientes), máx 5.
  const recentAppointments = useMemo(() => {
    const now = new Date();
    const todayIso = dateKeyOf(now);

    return [...allAppointments]
      .filter((a) => {
        const dateIso = dateKeyOf(a.date);
        return dateIso >= todayIso; // hoy + futuras
      })
      .sort((a, b) => {
        // Ordenar por fecha, y si es el mismo día por hora
        const dateDiff = dateKeyOf(a.date).localeCompare(dateKeyOf(b.date));
        if (dateDiff !== 0) return dateDiff;
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5);
  }, [allAppointments]);

  if (statsError) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center shadow-sm" role="alert">
        <p className="text-sm font-medium text-destructive">Error al cargar estadísticas</p>
        <p className="mt-1 text-sm text-destructive">{statsError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Resumen del consultorio · {monthYearLabel}
        </p>
      </div>

      {/* Stats Cards — clickeables, llevan a su sección */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-onboarding="stats">
        <StatsCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Citas hoy"
          value={overview.appointmentsToday}
          accent="blue"
          loading={statsLoading}
          sparkline={monthlyCounts}
          href="/dashboard/appointments"
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          label="Pacientes nuevos"
          value={overview.totalPatients}
          accent="green"
          loading={statsLoading}
          href="/dashboard/patients"
        />
        <StatsCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Tasa de completadas"
          value={`${overview.completionRate}%`}
          accent="purple"
          loading={statsLoading}
          sparkline={completionSeries}
          href="/dashboard/statistics"
          trend={{
            value: overview.completionRate,
            direction: overview.completionRate >= 50 ? "up" : "down",
          }}
        />
        <StatsCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Tasa de cancelación"
          value={`${overview.completionRate > 0 ? Math.round((100 - overview.completionRate) / 2) : 0}%`}
          accent="red"
          loading={statsLoading}
          href="/dashboard/statistics"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimas citas */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" />
                Próximas citas
              </CardTitle>
              <Link href="/dashboard/appointments">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="flex justify-center py-8"><Spinner size="md" /></div>
              ) : appsError ? (
                <div className="rounded-lg bg-destructive/10 p-4 text-center" role="alert">
                  <p className="text-sm text-destructive">{appsError.message}</p>
                </div>
              ) : (
                <AppointmentList
                  appointments={recentAppointments}
                  isLoading={false}
                  onSelectAppointment={(id) => router.push(`/dashboard/appointments?id=${id}`)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Acciones rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard/appointments">
                  <Button className="w-full justify-start gap-2" data-onboarding="new-appointment">
                    <Plus className="h-4 w-4" />
                    Nueva cita
                  </Button>
                </Link>
                <Link href="/dashboard/patients">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <UserPlus className="h-4 w-4" />
                    Nuevo paciente
                  </Button>
                </Link>
                <Link href="/dashboard/statistics">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <BarChart3 className="h-4 w-4" />
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
