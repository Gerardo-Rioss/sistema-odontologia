import { prisma } from "@/lib/prisma";
import type { Attachment, Prisma } from "@prisma/client";

export class AttachmentRepository {
  async findByPatient(patientId: string): Promise<Attachment[]> {
    return prisma.attachment.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Attachment | null> {
    return prisma.attachment.findUnique({ where: { id } });
  }

  async create(data: Prisma.AttachmentUncheckedCreateInput): Promise<Attachment> {
    return prisma.attachment.create({ data });
  }

  async delete(id: string): Promise<void> {
    await prisma.attachment.delete({ where: { id } });
  }
}
export const attachmentRepository = new AttachmentRepository();
