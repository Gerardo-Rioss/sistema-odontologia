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
