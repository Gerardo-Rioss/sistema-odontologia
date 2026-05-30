"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useAppointments } from "@/hooks/useAppointments";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import { AppointmentModal } from "@/components/dashboard/AppointmentModal";
import { AppointmentDetail } from "@/components/dashboard/AppointmentDetail";
import { Button } from "@/components/ui/Button";
import type { AppointmentListItem } from "@/types";
import { cn } from "@/lib/utils";

type ViewMode = "calendar" | "list";

/**
 * Página de gestión de citas odontológicas.
 *
 * Funcionalidades:
 * - Filtros por estado, fecha y búsqueda (FilterBar).
 * - Vista de calendario (CalendarView) o lista (AppointmentList) con toggle.
 * - Modal de creación/edición de citas (AppointmentModal).
 * - Modal de detalle de cita (AppointmentDetail).
 * - Estados de carga, vacío y error.
 */
export default function AppointmentsPage() {
  // ── Estado del store ──
  const isFormOpen = useStore((s) => s.isFormOpen);
  const openForm = useStore((s) => s.openForm);
  const closeForm = useStore((s) => s.closeForm);

  // ── Datos ──
  const { data: appointments = [], isLoading, error } = useAppointments();

  // ── Estado local ──
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentListItem | null>(null);

  // ── Cita seleccionada actual ──

  // ── Handlers ──

  const handleDayClick = useCallback(
    (_dateIso: string) => {
      // Al hacer clic en un día del calendario, cambiar a vista de lista
      // (el filtro de fecha ya lo aplica CalendarView internamente vía setDateFilter)
    },
    [],
  );

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

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Cabecera: título + botón nueva cita */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
        <Button variant="primary" size="md" onClick={handleNewAppointment}>
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva cita
        </Button>
      </div>

      {/* Barra de filtros */}
      <FilterBar
        showStatusFilter
        showDateFilter
        showSearch
        searchPlaceholder="Buscar paciente..."
      />

      {/* Toggle de vista: Calendario / Lista */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("calendar")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "calendar"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
          )}
        >
          <svg className="mr-1.5 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendario
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "list"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
          )}
        >
          <svg className="mr-1.5 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Lista
        </button>
      </div>

      {/* Vista: Calendario o Lista */}
      {viewMode === "calendar" ? (
        <CalendarView onDayClick={handleDayClick} />
      ) : (
        <AppointmentList
          appointments={appointments}
          isLoading={isLoading}
          error={error?.message ?? null}
          onSelectAppointment={handleSelectAppointment}
        />
      )}

      {/* ── Modales ── */}

      {/* Modal de creación/edición de cita */}
      <AppointmentModal
        open={isFormOpen}
        onClose={handleFormClose}
        appointment={editingAppointment}
      />

      {/* Modal de detalle de cita */}
      <AppointmentDetail
        open={detailId !== null}
        onClose={handleDetailClose}
        appointmentId={detailId}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}
