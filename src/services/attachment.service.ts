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

// ─── Upload validation (S-08) ────────────────────────────────

/** Tamaño máximo permitido: 10 MB. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types permitidos y sus extensiones asociadas. */
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
};

/** Extensiones de archivos ejecutables/peligrosos bloqueadas explícitamente. */
const BLOCKED_EXTENSIONS = [
  ".html",
  ".htm",
  ".svg",
  ".js",
  ".mjs",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".exe",
  ".dll",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
];

/** Detecta el tipo real por magic bytes (evita confiar solo en el header del cliente). */
function detectMagicType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // GIF: "GIF8"
  if (buffer.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // PDF: %PDF
  if (buffer.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  return null;
}

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

    this.validateUpload(file);

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

  /**
   * Valida un archivo antes de persistirlo: extensión, MIME declarado,
   * magic bytes reales y tamaño máximo. Lanza Error con mensaje claro.
   */
  private validateUpload(file: {
    name: string;
    type: string;
    size: number;
    buffer: Buffer;
  }): void {
    const ext = path.extname(file.name).toLowerCase();

    // 1. Bloquear extensiones ejecutables/peligrosas
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new Error(`Tipo de archivo no permitido (.${ext.replace(".", "")})`);
    }

    // 2. MIME declarado debe estar en la whitelist
    if (!ALLOWED_FILE_TYPES[file.type]) {
      throw new Error(`Tipo MIME no permitido: ${file.type || "desconocido"}`);
    }

    // 3. La extensión debe corresponder al MIME declarado
    if (!ALLOWED_FILE_TYPES[file.type].includes(ext)) {
      throw new Error(
        `La extensión .${ext.replace(".", "")} no corresponde al tipo ${file.type}`
      );
    }

    // 4. Tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("El archivo supera el tamaño máximo de 10 MB");
    }
    if (file.size === 0) {
      throw new Error("El archivo está vacío");
    }

    // 5. Magic bytes: verificar que el contenido real coincida con el MIME
    const magicType = detectMagicType(file.buffer);
    if (!magicType || magicType !== file.type) {
      throw new Error(
        `El contenido del archivo no coincide con su tipo declarado (${file.type})`
      );
    }
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
