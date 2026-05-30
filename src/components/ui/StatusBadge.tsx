import React from "react";
import type { AppointmentStatus, AppointmentType } from "@/types";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
} from "@/lib/constants";

// ─── Badge de estado de cita ──────────────────────────────────

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

/**
 * Pastilla de color que indica el estado de una cita.
 * PENDING → amarillo, CONFIRMED → verde, CANCELLED → rojo, COMPLETED → azul.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambia el status.
 */
export const StatusBadge = React.memo(function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className
      )}
      role="status"
    >
      {STATUS_LABELS[status]}
    </span>
  );
});

// ─── Badge de tipo de cita ────────────────────────────────────

interface TypeBadgeProps {
  type: AppointmentType;
  className?: string;
}

/**
 * Pastilla de color que indica el tipo de cita (Limpieza, Revisión, etc.).
 * Usa los colores definidos en APPOINTMENT_TYPE_COLORS.
 */
export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        APPOINTMENT_TYPE_COLORS[type],
        className
      )}
    >
      {APPOINTMENT_TYPE_LABELS[type]}
    </span>
  );
}
