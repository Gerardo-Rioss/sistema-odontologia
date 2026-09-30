import { z } from "zod";

/**
 * DTO para crear una cita odontológica.
 * Usa date + time separados para alinearse con el modelo Prisma.
 */
export const CreateAppointmentDTO = z.object({
  patientId: z.string().min(1, "El paciente es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:mm)"),
  type: z.enum(["LIMPIEZA", "REVISION", "URGENCIA", "TRATAMIENTO", "OTRO"], {
    errorMap: () => ({ message: "El tipo de cita es requerido" }),
  }),
  notes: z.string().optional(),
});

export type CreateAppointmentDTO = z.infer<typeof CreateAppointmentDTO>;

/**
 * DTO para crear un paciente.
 * Usa un solo campo `name` para alinearse con el modelo Prisma.
 */
export const CreatePatientDTO = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().datetime("Fecha inválida").optional(),
  notes: z.string().optional(),
});

export type CreatePatientDTO = z.infer<typeof CreatePatientDTO>;

/**
 * DTO para actualizar una cita.
 * Todos los campos son opcionales.
 */
export const UpdateAppointmentDTO = z.object({
  date: z.string().optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:mm)")
    .optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"])
    .optional(),
  type: z
    .enum(["LIMPIEZA", "REVISION", "URGENCIA", "TRATAMIENTO", "OTRO"])
    .optional(),
  notes: z.string().optional(),
});

export type UpdateAppointmentDTO = z.infer<typeof UpdateAppointmentDTO>;

/**
 * DTO para actualizar un paciente.
 * Todos los campos son opcionales.
 */
export const UpdatePatientDTO = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  phone: z.string().min(1, "El teléfono es requerido").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().datetime("Fecha inválida").optional(),
  notes: z.string().nullable().optional(),
});

export type UpdatePatientDTO = z.infer<typeof UpdatePatientDTO>;

// ─── Esquemas de autenticación ──────────────────────────────

/**
 * Esquema de validación para inicio de sesión.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "El correo es requerido" })
    .email("El correo electrónico no es válido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(1, "La contraseña es requerida"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

/**
 * Esquema de validación para registro de usuario.
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: "El correo es requerido" })
    .email("El correo electrónico no es válido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z
    .string({ required_error: "El nombre es requerido" })
    .min(1, "El nombre es requerido"),
  lastName: z
    .string({ required_error: "El apellido es requerido" })
    .min(1, "El apellido es requerido"),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

/**
 * Esquema de validación para solicitud de recuperación de contraseña.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "El correo es requerido" })
    .email("El correo electrónico no es válido"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

/**
 * Esquema de validación para restablecimiento de contraseña con token.
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: "El token es requerido" })
    .min(1, "El token es requerido"),
  password: z
    .string({ required_error: "La contraseña es requerida" })
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

// ─── Configuración del consultorio ───────────────────────────
/** Regex HH:mm (ej: "08:00", "20:30"). */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const UpdateClinicSettingsDTO = z.object({
  clinicName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  openTime: z.string().regex(TIME_PATTERN, "Formato de hora inválido (HH:mm)").or(z.literal("")).optional(),
  closeTime: z.string().regex(TIME_PATTERN, "Formato de hora inválido (HH:mm)").or(z.literal("")).optional(),
  workDays: z
    .string()
    .regex(/^[1-7](,[1-7])*$/, "Días inválidos (1-7 separados por coma)")
    .or(z.literal(""))
    .optional(),
  whatsappReminders: z.boolean().optional(),
  emailReminders: z.boolean().optional(),
  reminderHours: z.number().int().min(1).max(168).optional(),
}).strict();
export type UpdateClinicSettingsDTO = z.infer<typeof UpdateClinicSettingsDTO>;

// ─── Historia Clínica ─────────────────────────────────────────
export const UpdateMedicalRecordDTO = z.object({
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  conditions: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  dentalHistory: z.string().optional().nullable(),
  habits: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type UpdateMedicalRecordDTO = z.infer<typeof UpdateMedicalRecordDTO>;
