import { prisma } from "@/lib/prisma";
import type { MedicalRecord } from "@prisma/client";

export class MedicalRecordRepository {
  async findByPatient(patientId: string): Promise<MedicalRecord | null> {
    return prisma.medicalRecord.findUnique({ where: { patientId } });
  }

  async upsert(patientId: string, data: Partial<MedicalRecord>): Promise<MedicalRecord> {
    return prisma.medicalRecord.upsert({
      where: { patientId },
      create: { patientId, ...data },
      update: data,
    });
  }
}
export const medicalRecordRepository = new MedicalRecordRepository();
