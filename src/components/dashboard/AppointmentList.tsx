"use client";

import { CalendarDays } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { StatusBadge, TypeBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate, formatTime } from "@/lib/formatters";
import type { AppointmentListItem } from "@/types";

interface AppointmentListProps {
  /** Lista de citas a mostrar. */
  appointments: AppointmentListItem[];
  /** Estado de carga. */
  isLoading?: boolean;
  /** Mensaje de error (reemplaza la tabla). */
  error?: string | null;
  /** Callback al hacer clic en una fila. */
  onSelectAppointment?: (id: string) => void;
  className?: string;
}

/**
 * Tabla de citas con columnas: paciente, fecha, hora, tipo, estado.
 *
 * - Usa el componente genérico `Table` con ordenamiento.
 * - Muestra un `EmptyState` cuando no hay citas.
 * - Soporta clic en fila para ver detalle (vía `onSelectAppointment`).
 */
export function AppointmentList({
  appointments,
  isLoading = false,
  error,
  onSelectAppointment,
  className,
}: AppointmentListProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const columns = [
    {
      key: "patient",
      header: "Paciente",
      sortable: true,
      render: (row: AppointmentListItem) => row.patient.name,
    },
    {
      key: "date",
      header: "Fecha",
      sortable: true,
      render: (row: AppointmentListItem) => formatShortDate(row.date),
    },
    {
      key: "time",
      header: "Hora",
      sortable: true,
      render: (row: AppointmentListItem) => formatTime(row.time),
    },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      render: (row: AppointmentListItem) => <TypeBadge type={row.type} />,
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (row: AppointmentListItem) => <StatusBadge status={row.status} />,
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<CalendarDays className="h-12 w-12" />}
      message="No hay citas para mostrar"
    />
  );

  return (
    <Table
      columns={columns}
      data={appointments}
      isLoading={isLoading}
      emptyState={emptyState}
      onRowClick={(row) => onSelectAppointment?.(row.id)}
      className={className}
    />
  );
}
