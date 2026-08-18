import React from "react";
import type { AppointmentStatus, AppointmentType } from "@/types";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOTS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_DOTS,
} from "@/lib/constants";

// ─── Badge de estado de cita ──────────────────────────────────

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

/**
 * Pastilla de color que indica el estado de una cita.
 * PENDING → ámbar, CONFIRMED → esmeralda, CANCELLED → rosa, COMPLETED → cielo.
 * Incluye puntito de color + borde → legible en claro y oscuro.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambia el status.
 */
export const StatusBadge = React.memo(function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_COLORS[status],
        className
      )}
      role="status"
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOTS[status])} aria-hidden="true" />
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
 * Incluye puntito de color + borde → legible en claro y oscuro.
 */
export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        APPOINTMENT_TYPE_COLORS[type],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", APPOINTMENT_TYPE_DOTS[type])} aria-hidden="true" />
      {APPOINTMENT_TYPE_LABELS[type]}
    </span>
  );
}
