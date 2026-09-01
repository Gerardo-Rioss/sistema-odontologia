import type { Patient } from "@prisma/client";
import { patientRepository } from "@/repositories/patient.repository";
import type { CreatePatientDTO, UpdatePatientDTO } from "@/lib/validations";
import { verifyOwnership } from "@/lib/ownership";
import type { IPatientRepository } from "./types";

/**
 * Servicio de gestión de pacientes odontológicos.
 *
 * Orquesta la lógica de negocio entre los route handlers y el repositorio.
 * Verifica propiedad (multi-tenant) en cada operación que accede a un paciente
 * específico. La eliminación es definitiva (hard delete); Prisma maneja el
 * cascado de citas asociadas vía onDelete: Cascade.
 */
export class PatientService {
  constructor(private readonly patientRepo: IPatientRepository) {}

  // ─── Crear paciente ───────────────────────────────────────

  /**
   * Crea un nuevo paciente vinculado al dentista autenticado.
   */
  async create(
    data: CreatePatientDTO,
    userId: string
  ): Promise<Patient> {
    return this.patientRepo.create({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      notes: data.notes ?? null,
      userId,
    });
  }

  // ─── Actualizar paciente ──────────────────────────────────

  /**
   * Actualiza los datos de un paciente existente.
   *
   * @throws {Error} "Paciente no encontrado" si el id no existe
   * @throws {Error} "No tiene permiso para modificar este paciente" si no pertenece al usuario
   */
  async update(
    id: string,
    data: UpdatePatientDTO,
    userId: string
  ): Promise<Patient> {
    await this.verifyPatientOwnership(id, userId);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate
        ? new Date(data.birthDate)
        : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.patientRepo.update(id, updateData);
  }

  // ─── Listar pacientes ─────────────────────────────────────

  /**
   * Obtiene todos los pacientes del dentista con el conteo de citas.
   *
   * @param search — texto opcional para filtrar por nombre (búsqueda parcial, case-insensitive)
   *
   * La búsqueda se realiza en la base de datos para mejor rendimiento.
   */
  async getAll(
    userId: string,
    search?: string
  ): Promise<Patient[]> {
    return this.patientRepo.findByDentistWithSearch(userId, search);
  }

  // ─── Obtener paciente por ID ──────────────────────────────

  /**
   * Obtiene un paciente específico con sus últimas 10 citas.
   *
   * @throws {Error} "Paciente no encontrado" si el id no existe
   * @throws {Error} "No tiene permiso para acceder a este paciente" si no pertenece al usuario
   */
  async getById(
    id: string,
    userId: string
  ): Promise<Patient | null> {
    await this.verifyPatientOwnership(id, userId);

    // Obtener con citas incluidas (ya verificado el ownership)
    return this.patientRepo.findByIdWithAppointments(id, userId);
  }

  // ─── Eliminar paciente ────────────────────────────────────

  /**
   * Elimina definitivamente un paciente.
   *
   * Las citas asociadas se eliminan en cascada (onDelete: Cascade en el esquema Prisma).
   *
   * @throws {Error} "Paciente no encontrado" si el id no existe
   * @throws {Error} "No tiene permiso para eliminar este paciente" si no pertenece al usuario
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.verifyPatientOwnership(id, userId);
    await this.patientRepo.delete(id);
  }

  // ─── Verificación de propiedad (helper compartido) ────────

  /**
   * Verifica que el paciente existe y pertenece al usuario autenticado.
   *
   * Usa `findById` para distinguir entre 404 (no existe) y 403 (existe pero no es del usuario).
   *
   * @returns El paciente verificado.
   * @throws {Error} "Paciente no encontrado" si el id no existe
   * @throws {Error} "No tiene permiso para acceder a este paciente" si no pertenece al usuario
   */
  private async verifyPatientOwnership(
    id: string,
    userId: string
  ): Promise<Patient> {
    return verifyOwnership(
      this.patientRepo.findById.bind(this.patientRepo),
      id,
      userId,
      "Paciente no encontrado",
      "No tiene permiso para acceder a este paciente"
    );
  }

  // ─── Búsqueda por teléfono (WhatsApp bot) ───────────────

  /**
   * Busca un paciente por número de teléfono. Si no existe, lo crea
   * automáticamente con el teléfono como nombre placeholder.
   *
   * Usado por el bot de WhatsApp para auto-crear pacientes que interactúan
   * por primera vez.
   *
   * @throws {Error} "DENTIST_USER_ID is not configured" si falta la variable de entorno
   */
  async getPatientByPhone(phoneNumber: string): Promise<Patient> {
    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    const existing = await this.patientRepo.findByPhone(phoneNumber);
    if (existing) {
      return existing;
    }

    return this.patientRepo.create({
      name: phoneNumber,
      phone: phoneNumber,
      userId: dentistUserId,
    });
  }
}

/** Creates a PatientService wired to the real repository. */
export function createPatientService(): PatientService {
  return new PatientService(patientRepository);
}

/** Instancia singleton del servicio de pacientes. */
export const patientService = createPatientService();
