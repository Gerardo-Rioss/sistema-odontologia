import type { AppointmentStatus, AppointmentType } from "@/types";

// ─── Horario del consultorio ──────────────────────────────────

export const BUSINESS_HOURS = {
  start: 8, // 8:00 AM
  end: 18, // 6:00 PM
  lunchStart: 13, // 1:00 PM — inicio de almuerzo
  lunchEnd: 14, // 2:00 PM — fin de almuerzo
} as const;

// ─── Etiquetas y colores de tipo de cita ──────────────────────

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  LIMPIEZA: "Limpieza",
  REVISION: "Revisión",
  URGENCIA: "Urgencia",
  TRATAMIENTO: "Tratamiento",
  OTRO: "Otro",
};

/** Colores de fondo y texto para badges de tipo de cita (Tailwind). */
export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  LIMPIEZA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  REVISION: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  URGENCIA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  TRATAMIENTO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  OTRO: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

// ─── Etiquetas y colores de estado de cita ────────────────────

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

/**
 * Colores para badges de estado.
 * PENDING → amarillo, CONFIRMED → verde, CANCELLED → rojo, COMPLETED → azul.
 */
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

// ─── Días de la semana ────────────────────────────────────────

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const SHORT_DAY_NAMES = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;

// ─── Colores para los puntitos del calendario ─────────────────

/** Color de fondo del puntito indicador en las celdas del calendario. */
export const APPOINTMENT_DOT_COLORS: Record<AppointmentType, string> = {
  LIMPIEZA: "bg-green-500",
  REVISION: "bg-blue-500",
  URGENCIA: "bg-red-500",
  TRATAMIENTO: "bg-yellow-500",
  OTRO: "bg-gray-500",
};
