"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useAppointments } from "@/hooks/useAppointments";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { AppointmentModal } from "@/components/dashboard/AppointmentModal";
import { AppointmentDetail } from "@/components/dashboard/AppointmentDetail";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AppointmentListItem } from "@/types";
import { CalendarDays, List } from "lucide-react";

/**
 * Página de gestión de citas odontológicas.
 *
 * - Filtros por estado, fecha y búsqueda (FilterBar con shadcn Select).
 * - Vista de calendario o lista con shadcn Tabs.
 * - Modal de creación/edición de citas.
 * - Modal de detalle de cita.
 */
export default function AppointmentsPage() {
  const isFormOpen = useStore((s) => s.isFormOpen);
  const openForm = useStore((s) => s.openForm);
  const closeForm = useStore((s) => s.closeForm);

  const { data: appointments = [], isLoading, error } = useAppointments();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentListItem | null>(null);

  const handleDayClick = useCallback(() => {}, []);

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
