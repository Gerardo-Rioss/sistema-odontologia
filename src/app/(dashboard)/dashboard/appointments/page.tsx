"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useAppointments } from "@/hooks/useAppointments";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { AppointmentModal } from "@/components/dashboard/AppointmentModal";
import { AppointmentDetail } from "@/components/dashboard/AppointmentDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, List, X, CalendarCheck } from "lucide-react";
import { dateKeyOf } from "@/lib/formatters";
import type { AppointmentListItem } from "@/types";

/**
 * Página de gestión de citas odontológicas.
 *
 * - Filtros por estado, fecha y búsqueda (FilterBar con shadcn Select).
 * - Vista de calendario o lista con shadcn Tabs.
 * - Click en un día del calendario → muestra las citas de ese día.
 * - Modal de creación/edición de citas.
 * - Modal de detalle de cita.
 */
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Cargando...</div>}>
      <AppointmentsPageContent />
    </Suspense>
  );
}

function AppointmentsPageContent() {
  const searchParams = useSearchParams();
  const isFormOpen = useStore((s) => s.isFormOpen);
  const openForm = useStore((s) => s.openForm);
  const closeForm = useStore((s) => s.closeForm);

  const { data: appointments = [], isLoading, error } = useAppointments();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentListItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Si venimos del dashboard con ?id=XXX, abrir el detalle de esa cita
  useEffect(() => {
    const id = searchParams?.get("id");
    if (id) setDetailId(id);
  }, [searchParams]);

  // Citas del día seleccionado en el calendario (ordenadas por hora)
  const dayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return appointments
      .filter((a) => dateKeyOf(a.date) === selectedDay)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDay]);

  const handleDayClick = useCallback((dateIso: string) => {
    setSelectedDay(dateIso);
  }, []);

  const handleSelectAppointment = useCallback((id: string) => {
    setDetailId(id);
  }, []);

  const handleEditFromDetail = useCallback((apt: AppointmentListItem) => {
    setEditingAppointment(apt);
    openForm(apt.id);
  }, [openForm]);

  const handleNewAppointment = useCallback(() => {
    setEditingAppointment(null);
    openForm(null);
  }, [openForm]);

  const handleFormClose = useCallback(() => {
    setEditingAppointment(null);
    closeForm();
  }, [closeForm]);

  const handleDetailClose = useCallback(() => {
    setDetailId(null);
  }, []);

  const formatDayLabel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Citas</h1>
        <Button onClick={handleNewAppointment}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      {/* Filtros */}
      <FilterBar
        showStatusFilter
        showDateFilter
        showSearch
        searchPlaceholder="Buscar paciente..."
      />

      {/* Tabs: Calendario / Lista */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-1.5 h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView onDayClick={handleDayClick} />

          {/* Citas del día seleccionado */}
          {selectedDay && (
            <Card className="mt-4 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base capitalize">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  {formatDayLabel(selectedDay)}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Quitar filtro de día"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <AppointmentList
                  appointments={dayAppointments}
                  isLoading={isLoading}
                  error={error?.message ?? null}
                  onSelectAppointment={handleSelectAppointment}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <AppointmentList
            appointments={appointments}
            isLoading={isLoading}
            error={error?.message ?? null}
            onSelectAppointment={handleSelectAppointment}
          />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <AppointmentModal
        open={isFormOpen}
        onClose={handleFormClose}
        appointment={editingAppointment}
      />

      <AppointmentDetail
        open={detailId !== null}
        onClose={handleDetailClose}
        appointmentId={detailId}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}
