import { z } from "zod";

/**
 * DTO para crear una cita odontológica.
 */
export const CreateAppointmentDTO = z.object({
  patientId: z.string().min(1, "El paciente es requerido"),
  dateTime: z.string().datetime("Fecha y hora inválidas"),
  type: z.string().min(1, "El tipo de cita es requerido"),
  notes: z.string().optional(),
});

export type CreateAppointmentDTO = z.infer<typeof CreateAppointmentDTO>;

/**
 * DTO para crear un paciente.
 */
export const CreatePatientDTO = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CreatePatientDTO = z.infer<typeof CreatePatientDTO>;

/**
 * DTO para actualizar una cita.
 */
export const UpdateAppointmentDTO = z.object({
  dateTime: z.string().datetime("Fecha y hora inválidas").optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateAppointmentDTO = z.infer<typeof UpdateAppointmentDTO>;

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
