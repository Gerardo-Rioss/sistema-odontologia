import { medicalRecordRepository } from "@/repositories/medical-record.repository";
import { patientRepository } from "@/repositories/patient.repository";
import type { UpdateMedicalRecordDTO } from "@/lib/validations";
import type { MedicalRecord } from "@prisma/client";

export class MedicalRecordService {
  async getByPatient(patientId: string, userId: string): Promise<MedicalRecord | null> {
    await this.verifyPatientOwnership(patientId, userId);
    return medicalRecordRepository.findByPatient(patientId);
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
    return medicalRecordRepository.upsert(patientId, cleanData);
  }

  private async verifyPatientOwnership(patientId: string, userId: string): Promise<void> {
    const patient = await patientRepository.findById(patientId);
    if (!patient) throw new Error("Paciente no encontrado");
    if (patient.userId !== userId) throw new Error("No tiene permiso para acceder a este paciente");
  }
}
export const medicalRecordService = new MedicalRecordService();
