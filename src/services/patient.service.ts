import type { Patient } from "@/types";

/**
 * Servicio de gestión de pacientes.
 */
export class PatientService {
  /**
   * Crea un nuevo paciente.
   */
  async create(_data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    notes?: string;
  }): Promise<Patient> {
    throw new Error("PatientService.create() — no implementado aún");
  }

  /**
   * Actualiza los datos de un paciente.
   */
  async update(
    _id: string,
    _data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      notes: string;
    }>
  ): Promise<Patient> {
    throw new Error("PatientService.update() — no implementado aún");
  }

  /**
   * Busca pacientes por nombre o teléfono.
   */
  async search(_query: string): Promise<Patient[]> {
    throw new Error("PatientService.search() — no implementado aún");
  }

  /**
   * Obtiene el historial de citas de un paciente.
   */
  async getHistory(_patientId: string): Promise<unknown[]> {
    throw new Error("PatientService.getHistory() — no implementado aún");
  }
}
