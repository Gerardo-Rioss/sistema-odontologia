"use client";

import Link from "next/link";
import { formatDate, formatTime } from "@/lib/formatters";
import { StatusBadge, TypeBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAppointments } from "@/hooks/useAppointments";
import type { AppointmentListItem } from "@/types";

interface AppointmentDetailProps {
  /** Estado de apertura del modal de detalle. */
  open: boolean;
  /** Callback al cerrar. */
  onClose: () => void;
  /** ID de la cita a mostrar. Si es null, no se muestra nada. */
  appointmentId: string | null;
  /** Callback al iniciar edición de esta cita. */
  onEdit?: (appointment: AppointmentListItem) => void;
}

/**
 * Modal de detalle de cita (solo lectura).
 *
 * Muestra toda la información de una cita y ofrece acciones:
 * Confirmar, Cancelar, Reprogramar (editar).
 *
 * Obtiene los datos de la cita desde `useAppointments` filtrando por ID.
 */
export function AppointmentDetail({
  open,
  onClose,
  appointmentId,
  onEdit,
}: AppointmentDetailProps) {
  const { data: appointments = [], isLoading, error } = useAppointments();
  const { confirmAppointment, cancelAppointment, isConfirming, isCancelling } =
    useAppointmentMutations();

  const appointment = appointmentId
    ? appointments.find((a) => a.id === appointmentId) ?? null
    : null;

  const handleConfirm = async () => {
    if (!appointment) return;
    try {
      await confirmAppointment(appointment.id);
      onClose();
    } catch {
      // Error manejado por el hook
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    try {
      await cancelAppointment(appointment.id);
      onClose();
    } catch {
      // Error manejado por el hook
    }
  };

  const handleEdit = () => {
    if (appointment && onEdit) {
      onEdit(appointment);
      onClose();
    }
  };

  // ── Estados ──
  if (!open || !appointmentId) return null;

  if (isLoading) {
    return (
      <Modal open={open} onClose={onClose} title="Detalle de cita" size="md">
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal open={open} onClose={onClose} title="Detalle de cita" size="md">
        <div className="rounded-lg bg-red-50 p-4 text-center" role="alert">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </Modal>
    );
  }

  if (!appointment) {
    return (
      <Modal open={open} onClose={onClose} title="Detalle de cita" size="md">
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">Cita no encontrada</p>
        </div>
      </Modal>
    );
  }

  const canConfirm = appointment.status === "PENDING";
  const canCancel =
    appointment.status === "PENDING" || appointment.status === "CONFIRMED";
  const canEdit = appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED";

  const footer = (
    <div className="flex flex-wrap gap-2">
      {canConfirm && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          loading={isConfirming}
        >
          Confirmar
        </Button>
      )}
      {canCancel && (
        <Button
          variant="danger"
          size="sm"
          onClick={handleCancel}
          loading={isCancelling}
        >
          Cancelar cita
        </Button>
      )}
      {canEdit && (
        <Button variant="secondary" size="sm" onClick={handleEdit}>
          Editar
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de cita"
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Estado y tipo */}
        <div className="flex items-center gap-2">
          <StatusBadge status={appointment.status} />
          <TypeBadge type={appointment.type} />
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Fecha</p>
            <p className="text-sm text-gray-900">{formatDate(appointment.date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Hora</p>
            <p className="text-sm text-gray-900">{formatTime(appointment.time)}</p>
          </div>
        </div>

        {/* Paciente */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Paciente</p>
          <Link
            href={`/dashboard/patients`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {appointment.patient.name}
          </Link>
        </div>

        {/* Notas */}
        {appointment.notes && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Notas</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {appointment.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
