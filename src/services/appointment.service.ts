import type { Appointment } from "@prisma/client";
import { appointmentRepository } from "@/repositories/appointment.repository";
import { calendarService } from "@/services/calendar.service";
import type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "@/lib/validations";
import { verifyOwnership } from "@/lib/ownership";
import { dateKeyOf } from "@/lib/formatters";
import { ConflictError } from "@/lib/errors";
import type { IAppointmentRepository, ICalendarSync } from "./types";

/**
 * Servicio de gestión de citas odontológicas.
 *
 * Orquesta la lógica de negocio entre los route handlers y el repositorio.
 * Aplica verificación de propiedad (multi-tenant) y detección de conflictos
 * de horario antes de crear o modificar citas.
 *
 * Dispara sync con Google Calendar de forma fire-and-forget después de cada
 * operación que modifica una cita.
 */
export class AppointmentService {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly calendarSync: ICalendarSync = calendarService
  ) {}
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

    const appointment = await this.appointmentRepo.create({
      patientId: data.patientId,
      date: new Date(data.date),
      time: data.time,
      type: data.type,
      notes: data.notes ?? null,
      userId,
    });

    // Fire-and-forget: sync to Google Calendar
    this.calendarSync
      .syncToCalendar(appointment.id, userId)
      .catch((err) =>
        console.error(
          `[AppointmentService] Calendar sync failed for ${appointment.id}:`,
          err
        )
      );

    return appointment;
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

    const newDate = data.date ?? dateKeyOf(appointment.date);
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

    const updated = await this.appointmentRepo.update(id, updateData);

    // Fire-and-forget: sync to Google Calendar
    this.calendarSync
      .syncToCalendar(updated.id, userId)
      .catch((err) =>
        console.error(
          `[AppointmentService] Calendar sync failed for ${updated.id}:`,
          err
        )
      );

    return updated;
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
      throw new ConflictError("La cita ya está cancelada");
    }

    const updated = await this.appointmentRepo.update(id, {
      status: "CANCELLED",
    });

    // Fire-and-forget: sync to Google Calendar
    this.calendarSync
      .syncToCalendar(updated.id, userId)
      .catch((err) =>
        console.error(
          `[AppointmentService] Calendar sync failed for ${updated.id}:`,
          err
        )
      );

    return updated;
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
      throw new ConflictError("Solo se pueden confirmar citas pendientes");
    }

    const updated = await this.appointmentRepo.update(id, {
      status: "CONFIRMED",
    });

    // Fire-and-forget: sync to Google Calendar
    this.calendarSync
      .syncToCalendar(updated.id, userId)
      .catch((err) =>
        console.error(
          `[AppointmentService] Calendar sync failed for ${updated.id}:`,
          err
        )
      );

    return updated;
  }

  // ─── Listar citas ──────────────────────────────────────────

  /**
   * Obtiene todas las citas del dentista con nombre del paciente.
   *
   * Filtros opcionales:
   * - `status`: filtra por estado (PENDING, CONFIRMED, etc.)
   * - `date`: filtra por fecha específica (YYYY-MM-DD)
   * - `search`: busca por nombre de paciente (case-insensitive)
   *
   * Los filtros se aplican en la base de datos para mejor rendimiento.
   */
  async getAll(
    userId: string,
    filters?: { status?: string; date?: string; search?: string }
  ): Promise<Appointment[]> {
    return this.appointmentRepo.findByDentistWithFilters(userId, filters);
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
    const appointment = await this.verifyOwnership(id, userId);

    // Fire-and-forget: delete from Google Calendar before local deletion
    if (appointment.googleEventId && appointment.googleCalendarId) {
      this.calendarSync
        .deleteFromCalendar(
          appointment.googleEventId,
          appointment.googleCalendarId,
          userId
        )
        .catch((err) =>
          console.error(
            `[AppointmentService] Calendar delete failed for ${appointment.id}:`,
            err
          )
        );
    }

    await this.appointmentRepo.delete(id);
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
    return verifyOwnership(
      this.appointmentRepo.findById.bind(this.appointmentRepo),
      id,
      userId,
      "Cita no encontrada",
      "No tiene permiso para acceder a esta cita"
    );
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
    const conflict = await this.appointmentRepo.findByDentistAndTime(
      userId,
      date,
      time,
      excludeId
    );

    if (conflict) {
      throw new ConflictError(
        "Conflicto de horario: ya existe una cita en esta fecha y hora"
      );
    }
  }

}

/** Creates an AppointmentService wired to the real repository and calendar. */
export function createAppointmentService(): AppointmentService {
  return new AppointmentService(appointmentRepository, calendarService);
}

/** Instancia singleton del servicio de citas. */
export const appointmentService = createAppointmentService();
