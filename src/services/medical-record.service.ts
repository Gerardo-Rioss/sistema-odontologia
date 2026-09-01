import { medicalRecordRepository } from "@/repositories/medical-record.repository";
import { patientRepository } from "@/repositories/patient.repository";
import type { UpdateMedicalRecordDTO } from "@/lib/validations";
import { verifyOwnership } from "@/lib/ownership";
import type { MedicalRecord } from "@prisma/client";
import type {
  IMedicalRecordRepository,
  IPatientRepository,
} from "./types";

export class MedicalRecordService {
  constructor(
    private readonly medicalRecordRepo: IMedicalRecordRepository,
    private readonly patientRepo: IPatientRepository
  ) {}

  async getByPatient(patientId: string, userId: string): Promise<MedicalRecord | null> {
    await this.verifyPatientOwnership(patientId, userId);
    return this.medicalRecordRepo.findByPatient(patientId);
  }

  async upsert(patientId: string, data: UpdateMedicalRecordDTO, userId: string): Promise<MedicalRecord> {
    await this.verifyPatientOwnership(patientId, userId);
    const cleanData: Record<string, unknown> = {};
    if (data.allergies !== undefined) cleanData.allergies = data.allergies;
    if (data.medications !== undefined) cleanData.medications = data.medications;
    if (data.conditions !== undefined) cleanData.conditions = data.conditions;
    if (data.bloodType !== undefined) cleanData.bloodType = data.bloodType;
    if (data.dentalHistory !== undefined) cleanData.dentalHistory = data.dentalHistory;
    if (data.habits !== undefined) cleanData.habits = data.habits;
    if (data.notes !== undefined) cleanData.notes = data.notes;
    return this.medicalRecordRepo.upsert(patientId, cleanData);
  }

  private async verifyPatientOwnership(patientId: string, userId: string): Promise<void> {
    await verifyOwnership(
      this.patientRepo.findById.bind(this.patientRepo),
      patientId,
      userId,
      "Paciente no encontrado",
      "No tiene permiso para acceder a este paciente"
    );
  }
}

/** Creates a MedicalRecordService wired to the real repositories. */
export function createMedicalRecordService(): MedicalRecordService {
  return new MedicalRecordService(medicalRecordRepository, patientRepository);
}

export const medicalRecordService = createMedicalRecordService();
