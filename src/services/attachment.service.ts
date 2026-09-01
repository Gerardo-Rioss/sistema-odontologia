import { attachmentRepository } from "@/repositories/attachment.repository";
import { patientRepository } from "@/repositories/patient.repository";
import type { Attachment } from "@prisma/client";
import path from "path";
import fs from "fs/promises";
import { verifyOwnership } from "@/lib/ownership";
import type {
  IAttachmentRepository,
  IPatientRepository,
  IFileStorage,
} from "./types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "patients");

export class AttachmentService {
  constructor(
    private readonly attachmentRepo: IAttachmentRepository,
    private readonly patientRepo: IPatientRepository,
    private readonly fileStorage: IFileStorage
  ) {}

  async getByPatient(patientId: string, userId: string): Promise<Attachment[]> {
    await this.verifyPatientOwnership(patientId, userId);
    return this.attachmentRepo.findByPatient(patientId);
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
    await this.fileStorage.mkdir(patientDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(patientDir, safeName);
    const publicPath = `/uploads/patients/${patientId}/${safeName}`;

    await this.fileStorage.writeFile(filePath, file.buffer);

    return this.attachmentRepo.create({
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
    const attachment = await this.attachmentRepo.findById(attachmentId);
    if (!attachment) throw new Error("Archivo no encontrado");
    await this.verifyPatientOwnership(attachment.patientId, userId);

    const fullPath = path.join(process.cwd(), "public", attachment.filePath);
    try { await this.fileStorage.unlink(fullPath); } catch { /* file may not exist */ }

    await this.attachmentRepo.delete(attachmentId);
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

/** Creates an AttachmentService wired to the real repositories and fs. */
export function createAttachmentService(): AttachmentService {
  return new AttachmentService(
    attachmentRepository,
    patientRepository,
    fs as unknown as IFileStorage
  );
}

export const attachmentService = createAttachmentService();
