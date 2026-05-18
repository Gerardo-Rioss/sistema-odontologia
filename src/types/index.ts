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
  whatsappReminderSent: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  user?: User;
  patient?: Patient;
  whatsappMessages?: WhatsAppMessage[];
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

// ─── Dirección de mensaje WhatsApp ────────────────────────────
export type MessageDirection = "INBOUND" | "OUTBOUND";

// ─── Tipo de mensaje WhatsApp ───────────────────────────────
export type MessageTypeEnum = "TEXT" | "TEMPLATE" | "INTERACTIVE";

// ─── Estados de conversación WhatsApp ────────────────────────
export type ConversationStateEnum =
  | "IDLE"
  | "GREETING"
  | "SERVICE_SELECTION"
  | "DATE_SELECTION"
  | "TIME_SELECTION"
  | "CONFIRMATION"
  | "COMPLETED";

// ─── Contexto de conversación ────────────────────────────────
export interface ConversationContext {
  selectedService?: string;
  selectedDate?: string;
  selectedTime?: string;
  appointmentId?: string;
  awaitingCancellation?: boolean;
}

// ─── Mensaje de WhatsApp ─────────────────────────────────────
export interface WhatsAppMessage {
  id: string;
  waMessageId: string;
  phoneNumber: string;
  body: string;
  direction: MessageDirection;
  messageType: MessageTypeEnum;
  templateName: string | null;
  userId: string | null;
  appointmentId: string | null;
  createdAt: Date;

  // Relaciones (opcionales, presentes al hacer include)
  user?: User;
  appointment?: Appointment;
}

// ─── Estado de conversación WhatsApp ─────────────────────────
export interface ConversationState {
  id: string;
  phoneNumber: string;
  currentState: ConversationStateEnum;
  context: ConversationContext;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Payload del webhook de WhatsApp ────────────────────────
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppInboundMessage[];
  statuses?: unknown[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppInboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: unknown;
}

// ─── Slot disponible ────────────────────────────────────────
export interface AvailableSlot {
  time: string;
  available: boolean;
}

// ─── Respuesta de API genérica ───────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
