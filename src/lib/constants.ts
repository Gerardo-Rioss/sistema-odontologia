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

/**
 * Colores de fondo y texto para badges de tipo de cita.
 * Fondos más presentes + dot de color + texto saturado → vivos en claro y oscuro.
 */
export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  LIMPIEZA:
    "bg-emerald-100 text-black border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  REVISION:
    "bg-sky-100 text-black border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
  URGENCIA:
    "bg-rose-100 text-black border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
  TRATAMIENTO:
    "bg-amber-100 text-black border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  OTRO: "bg-slate-100 text-black border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40",
};

/** Puntito de color sólido para los badges de tipo. */
export const APPOINTMENT_TYPE_DOTS: Record<AppointmentType, string> = {
  LIMPIEZA: "bg-emerald-500",
  REVISION: "bg-sky-500",
  URGENCIA: "bg-rose-500",
  TRATAMIENTO: "bg-amber-500",
  OTRO: "bg-slate-400",
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
 * PENDING → amber, CONFIRMED → emerald, CANCELLED → rose, COMPLETED → sky.
 * Fondos presentes + texto oscuro en claro / brillante en oscuro.
 */
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING:
    "bg-amber-100 text-black border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  CONFIRMED:
    "bg-emerald-100 text-black border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  CANCELLED:
    "bg-rose-100 text-black border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
  COMPLETED:
    "bg-sky-100 text-black border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
};

/** Puntito de color sólido para los badges de estado. */
export const STATUS_DOTS: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-emerald-500",
  CANCELLED: "bg-rose-500",
  COMPLETED: "bg-sky-500",
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
