import type { Appointment } from "@/types";

/**
 * Servicio de gestión de citas odontológicas.
 * Orquesta la lógica de negocio entre los route handlers y el repositorio.
 */
export class AppointmentService {
  /**
   * Programa una nueva cita.
   */
  async schedule(_data: {
    patientId: string;
    dateTime: Date;
    type: string;
    notes?: string;
  }): Promise<Appointment> {
    throw new Error("AppointmentService.schedule() — no implementado aún");
  }

  /**
   * Reprograma una cita existente.
   */
  async reschedule(_id: string, _newDateTime: Date): Promise<Appointment> {
    throw new Error("AppointmentService.reschedule() — no implementado aún");
  }

  /**
   * Cancela una cita (soft delete — cambia estado a CANCELLED).
   */
  async cancel(_id: string): Promise<Appointment> {
    throw new Error("AppointmentService.cancel() — no implementado aún");
  }

  /**
   * Confirma una cita programada.
   */
  async confirm(_id: string): Promise<Appointment> {
    throw new Error("AppointmentService.confirm() — no implementado aún");
  }

  /**
   * Obtiene las citas de un día específico.
   */
  async getByDate(_date: Date): Promise<Appointment[]> {
    throw new Error("AppointmentService.getByDate() — no implementado aún");
  }
}
