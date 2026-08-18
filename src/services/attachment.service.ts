import { attachmentRepository } from "@/repositories/attachment.repository";
import { patientRepository } from "@/repositories/patient.repository";
import type { Attachment } from "@prisma/client";
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "patients");

export class AttachmentService {
  async getByPatient(patientId: string, userId: string): Promise<Attachment[]> {
    await this.verifyPatientOwnership(patientId, userId);
    return attachmentRepository.findByPatient(patientId);
  }

  async upload(
    patientId: string,
    userId: string,
    file: { name: string; type: string; size: number; buffer: Buffer },
    category?: string,
    notes?: string,
  ): Promise<Attachment> {
    await this.verifyPatientOwnership(patientId, userId);

    const patientDir = path.join(UPLOADS_DIR, patientId);
    await fs.mkdir(patientDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(patientDir, safeName);
    const publicPath = `/uploads/patients/${patientId}/${safeName}`;

    await fs.writeFile(filePath, file.buffer);

    return attachmentRepository.create({
      patientId,
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath: publicPath,
      category: category || null,
      notes: notes || null,
    });
  }

  async delete(attachmentId: string, userId: string): Promise<void> {
    const attachment = await attachmentRepository.findById(attachmentId);
    if (!attachment) throw new Error("Archivo no encontrado");
    await this.verifyPatientOwnership(attachment.patientId, userId);

    const fullPath = path.join(process.cwd(), "public", attachment.filePath);
    try { await fs.unlink(fullPath); } catch { /* file may not exist */ }

    await attachmentRepository.delete(attachmentId);
  }

  private async verifyPatientOwnership(patientId: string, userId: string): Promise<void> {
    const patient = await patientRepository.findById(patientId);
    if (!patient) throw new Error("Paciente no encontrado");
    if (patient.userId !== userId) throw new Error("No tiene permiso para acceder a este paciente");
  }
}
export const attachmentService = new AttachmentService();
