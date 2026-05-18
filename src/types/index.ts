// ─── Roles de usuario ────────────────────────────────────────
export type Role = "ADMIN" | "DENTIST";

// ─── Estados de cita ─────────────────────────────────────────
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

// ─── Usuario ─────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

// ─── Paciente ────────────────────────────────────────────────
export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthDate: Date | null;
  createdAt: Date;
}

// ─── Cita ────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  date: Date;
  status: AppointmentStatus;
  notes: string | null;
  userId: string;
  patientId: string;
  createdAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  user?: User;
  patient?: Patient;
}

// ─── Respuesta de API genérica ───────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
