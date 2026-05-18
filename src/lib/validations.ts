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
