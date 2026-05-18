import type { Appointment } from "@prisma/client";
import { appointmentRepository } from "@/repositories/appointment.repository";
import type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "@/lib/validations";

/**
 * Servicio de gestión de citas odontológicas.
 *
 * Orquesta la lógica de negocio entre los route handlers y el repositorio.
 * Aplica verificación de propiedad (multi-tenant) y detección de conflictos
 * de horario antes de crear o modificar citas.
 */
export class AppointmentService {
  // ─── Programar cita ─────────────────────────────────────────

  /**
   * Programa una nueva cita odontológica.
   *
   * Verifica que no exista otra cita del mismo dentista en la misma fecha y hora.
   *
   * @throws {Error} "Conflicto de horario: ya existe una cita en esta fecha y hora"
   */
  async schedule(
    data: CreateAppointmentDTO,
    userId: string
  ): Promise<Appointment> {
    await this.checkTimeConflict(userId, data.date, data.time);

    return appointmentRepository.create({
      patientId: data.patientId,
      date: new Date(data.date),
      time: data.time,
      type: data.type,
      notes: data.notes ?? null,
      userId,
    });
  }

  // ─── Reprogramar cita ──────────────────────────────────────

  /**
   * Reprograma la fecha y/u hora de una cita existente.
   *
   * Verifica propiedad de la cita y que el nuevo horario no colisione
   * con otra cita del mismo dentista (excluyendo la cita actual).
   *
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para modificar esta cita" si no pertenece al usuario
   * @throws {Error} "Conflicto de horario: ya existe una cita en esta fecha y hora"
   */
  async reschedule(
    id: string,
    data: UpdateAppointmentDTO,
    userId: string
  ): Promise<Appointment> {
    const appointment = await this.verifyOwnership(id, userId);

    const newDate = data.date ?? this.formatDate(appointment.date);
    const newTime = data.time ?? appointment.time;

    // Verificar conflicto si cambió fecha u hora
    if (data.date || data.time) {
      await this.checkTimeConflict(userId, newDate, newTime, id);
    }

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.time !== undefined) updateData.time = data.time;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return appointmentRepository.update(id, updateData);
  }

  // ─── Cancelar cita ─────────────────────────────────────────

  /**
   * Cancela una cita (cambia estado a CANCELLED).
   *
   * Solo se puede cancelar si está en estado PENDING o CONFIRMED.
   *
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para modificar esta cita" si no pertenece al usuario
   * @throws {Error} "La cita ya está cancelada" si ya está en CANCELLED
   */
  async cancel(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.verifyOwnership(id, userId);

    if (appointment.status === "CANCELLED") {
      throw new Error("La cita ya está cancelada");
    }

    return appointmentRepository.update(id, {
      status: "CANCELLED",
    });
  }

  // ─── Confirmar cita ────────────────────────────────────────

  /**
   * Confirma una cita (PENDING → CONFIRMED).
   *
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para modificar esta cita" si no pertenece al usuario
   * @throws {Error} "Solo se pueden confirmar citas pendientes" si no está en PENDING
   */
  async confirm(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.verifyOwnership(id, userId);

    if (appointment.status !== "PENDING") {
      throw new Error("Solo se pueden confirmar citas pendientes");
    }

    return appointmentRepository.update(id, {
      status: "CONFIRMED",
    });
  }

  // ─── Listar citas ──────────────────────────────────────────

  /**
   * Obtiene todas las citas del dentista con nombre del paciente.
   *
   * Filtros opcionales:
   * - `status`: filtra por estado (PENDING, CONFIRMED, etc.)
   * - `date`: filtra por fecha específica (YYYY-MM-DD)
   */
  async getAll(
    userId: string,
    filters?: { status?: string; date?: string }
  ): Promise<Appointment[]> {
    let appointments = await appointmentRepository.findByDentist(userId);

    if (filters?.status) {
      appointments = appointments.filter((a) => a.status === filters.status);
    }

    if (filters?.date) {
      appointments = appointments.filter(
        (a) => this.formatDate(a.date) === filters.date
      );
    }

    return appointments;
  }

  // ─── Obtener cita por ID ───────────────────────────────────

  /**
   * Obtiene una cita específica con el nombre del paciente.
   *
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para acceder a esta cita" si no pertenece al usuario
   */
  async getById(id: string, userId: string): Promise<Appointment> {
    return this.verifyOwnership(id, userId);
  }

  // ─── Eliminar cita ─────────────────────────────────────────

  /**
   * Elimina definitivamente una cita.
   *
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para eliminar esta cita" si no pertenece al usuario
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);
    await appointmentRepository.delete(id);
  }

  // ─── Helpers privados ──────────────────────────────────────

  /**
   * Verifica que la cita existe y pertenece al usuario.
   *
   * Usa `findById` para detectar 404 (no existe) vs 403 (existe pero no es del usuario).
   *
   * @returns La cita verificada.
   * @throws {Error} "Cita no encontrada" si el id no existe
   * @throws {Error} "No tiene permiso para acceder a esta cita" si no pertenece al usuario
   */
  private async verifyOwnership(
    id: string,
    userId: string
  ): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);

    if (!appointment) {
      throw new Error("Cita no encontrada");
    }

    if (appointment.userId !== userId) {
      throw new Error("No tiene permiso para acceder a esta cita");
    }

    return appointment;
  }

  /**
   * Verifica que no exista otra cita en la misma fecha y hora para el dentista.
   *
   * @param excludeId — ID de la cita a excluir (usado en reschedule para no colisionar consigo misma)
   * @throws {Error} "Conflicto de horario: ya existe una cita en esta fecha y hora"
   */
  private async checkTimeConflict(
    userId: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<void> {
    const appointments = await appointmentRepository.findByDentist(userId);

    const conflict = appointments.find(
      (a) =>
        this.formatDate(a.date) === date &&
        a.time === time &&
        a.id !== excludeId
    );

    if (conflict) {
      throw new Error(
        "Conflicto de horario: ya existe una cita en esta fecha y hora"
      );
    }
  }

  /**
   * Convierte una fecha a string ISO (YYYY-MM-DD).
   */
  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}

/** Instancia singleton del servicio de citas. */
export const appointmentService = new AppointmentService();
