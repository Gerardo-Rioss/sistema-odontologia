// ─── Roles de usuario ────────────────────────────────────────
export type Role = "ADMIN" | "DENTIST";

// ─── Estados de cita ─────────────────────────────────────────
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

// ─── Tipos de cita ──────────────────────────────────────────
export type AppointmentType =
  | "LIMPIEZA"
  | "REVISION"
  | "URGENCIA"
  | "TRATAMIENTO"
  | "OTRO";

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
  notes: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  user?: User;
  appointments?: Appointment[];
  _count?: { appointments: number };
}

// ─── Cita ────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  date: Date;
  time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  notes: string | null;
  userId: string;
  patientId: string;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  user?: User;
  patient?: Patient;
}

// ─── Item de lista de citas (incluye nombre del paciente) ──
export interface AppointmentListItem {
  id: string;
  date: Date;
  time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  notes: string | null;
  patientId: string;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    name: string;
  };
}

// ─── Mensaje ─────────────────────────────────────────────────
export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  appointmentId: string | null;
  readAt: Date | null;
  createdAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  sender?: User;
  receiver?: User;
  appointment?: Appointment;
}

// ─── Respuesta de API genérica ───────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
