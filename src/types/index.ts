// ─── Roles de usuario ────────────────────────────────────────
export type Role = "ADMIN" | "DENTIST";

// ─── Estados de cita ─────────────────────────────────────────
export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

// ─── Usuario ─────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string | null; // @deprecated — usar firstName + lastName
  role: Role;
  emailVerified: Date | null;
  createdAt: Date;
}

// ─── Usuario en sesión (cliente) ─────────────────────────────
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: Date | null;
}

// ─── Inputs de autenticación ─────────────────────────────────
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// ─── Respuesta de autenticación ──────────────────────────────
export interface AuthResponse {
  success: boolean;
  data?: {
    user: SessionUser;
  };
  error?: string;
  message?: string;
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
