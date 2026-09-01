import type {
  Patient,
  Appointment,
  MedicalRecord,
  Attachment,
  CalendarConnection,
} from "@prisma/client";
import type { SyncResult } from "@/types/calendar";

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByDentist(userId: string): Promise<Patient[]>;
  findByDentistWithSearch(
    userId: string,
    search?: string,
    options?: { skip?: number; take?: number }
  ): Promise<Patient[]>;
  findByPhone(phone: string): Promise<Patient | null>;
  findByIdWithAppointments(
    id: string,
    userId: string
  ): Promise<Patient | null>;
  create(data: Partial<Patient>): Promise<Patient>;
  update(id: string, data: Partial<Patient>): Promise<Patient>;
  delete(id: string): Promise<void>;
}

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findByDentist(
    userId: string
  ): Promise<
    (Appointment & { patient: { id: string; name: string } | null })[]
  >;
  findByDentistWithFilters(
    userId: string,
    filters?: { status?: string; date?: string; search?: string },
    options?: { skip?: number; take?: number }
  ): Promise<
    (Appointment & { patient: { id: string; name: string } | null })[]
  >;
  findByDentistAndTime(
    userId: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<Appointment | null>;
  create(data: Partial<Appointment>): Promise<Appointment>;
  update(id: string, data: Partial<Appointment>): Promise<Appointment>;
  delete(id: string): Promise<void>;
}

export interface IMedicalRecordRepository {
  findByPatient(patientId: string): Promise<MedicalRecord | null>;
  upsert(
    patientId: string,
    data: Partial<MedicalRecord>
  ): Promise<MedicalRecord>;
}

export interface IAttachmentRepository {
  findById(id: string): Promise<Attachment | null>;
  findByPatient(patientId: string): Promise<Attachment[]>;
  create(data: {
    patientId: string;
    userId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    category: string | null;
    notes: string | null;
  }): Promise<Attachment>;
  delete(id: string): Promise<void>;
}

export interface IStatisticsRepository {
  getCounts(
    userId: string,
    cutoff: Date,
    today: Date
  ): Promise<{
    totalAppointments: number;
    appointmentsToday: number;
    completedCount: number;
  }>;
  getTotalPatients(userId: string): Promise<number>;
  getByMonth(
    userId: string,
    cutoff: Date
  ): Promise<{ month: string; count: number }[]>;
  getByType(
    userId: string,
    cutoff: Date
  ): Promise<{ type: string; count: number }[]>;
  getByStatus(
    userId: string,
    cutoff: Date
  ): Promise<{ status: string; count: number }[]>;
  getPatientAppointmentCounts(
    userId: string,
    cutoff: Date
  ): Promise<{ patientId: string; count: number }[]>;
}

export interface IFileStorage {
  mkdir(dir: string, opts?: { recursive?: boolean }): Promise<void>;
  writeFile(path: string, data: Buffer): Promise<void>;
  unlink(path: string): Promise<void>;
}

export interface ICalendarSync {
  syncToCalendar(appointmentId: string, userId: string): Promise<SyncResult>;
  deleteFromCalendar(
    eventId: string,
    calendarId: string,
    userId: string
  ): Promise<SyncResult>;
}

export interface ICalendarRepository {
  findByUserId(userId: string): Promise<CalendarConnection | null>;
  upsertTokens(
    userId: string,
    data: {
      accessToken: string;
      refreshToken: string;
      tokenExpiry: Date;
      googleEmail: string | null;
      googleCalendarId: string;
    }
  ): Promise<void>;
  updateLastSyncedAt(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAppointmentReader {
  findById(id: string): Promise<Appointment | null>;
  findByGoogleEventId(googleEventId: string): Promise<Appointment | null>;
  findByDentist(
    userId: string
  ): Promise<
    (Appointment & { patient: { id: string; name: string } | null })[]
  >;
  update(id: string, data: Partial<Appointment>): Promise<Appointment>;
}

// ─── WhatsApp Messaging ───────────────────────────────────────

export interface IWhatsAppClient {
  sendTextMessage(
    phone: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTemplateMessage(
    phone: string,
    template: string,
    lang?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendInteractiveList(
    phone: string,
    header: string,
    body: string,
    button: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
  markMessageAsRead(
    messageId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ─── Conversation State ───────────────────────────────────────

export interface IConversationStateRepository {
  findFirst(args: {
    where: { phoneNumber: string };
    orderBy: { updatedAt: "desc" };
  }): Promise<{
    id: string;
    phoneNumber: string;
    currentState: string;
    context: unknown;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  create(args: {
    data: {
      phoneNumber: string;
      currentState: string;
      context: unknown;
      expiresAt: Date;
    };
  }): Promise<{
    id: string;
    phoneNumber: string;
    currentState: string;
    context: unknown;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  update(args: {
    where: { id: string };
    data: {
      currentState: string;
      context: unknown;
      expiresAt: Date;
    };
  }): Promise<{
    id: string;
    phoneNumber: string;
    currentState: string;
    context: unknown;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  delete(args: { where: { id: string } }): Promise<void>;
  deleteMany(args: { where: { phoneNumber: string } }): Promise<void>;
}

// ─── Slot Computation ─────────────────────────────────────────

export interface IAppointmentReader {
  findByDentist(
    userId: string
  ): Promise<
    (Appointment & { patient: { id: string; name: string } | null })[]
  >;
}
