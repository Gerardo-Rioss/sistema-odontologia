import { prisma } from "@/lib/prisma";
import type { ClinicSettings } from "@prisma/client";

/** Campos editables de la configuración (ya sanitizados por la API). */
export interface ClinicSettingsData {
  clinicName?: string;
  address?: string;
  city?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  workDays?: string;
  whatsappReminders?: boolean;
  emailReminders?: boolean;
  reminderHours?: number;
}

/**
 * Repository para la configuración del consultorio (ClinicSettings).
 * Patrón 1:1 con User — cada usuario tiene un solo registro.
 */
export const clinicSettingsRepository = {
  /** Busca la configuración del consultorio de un usuario. */
  async findByUserId(userId: string) {
    return prisma.clinicSettings.findUnique({ where: { userId } });
  },

  /** Crea la configuración con valores por defecto si no existe. */
  async findOrCreate(userId: string): Promise<ClinicSettings> {
    const existing = await prisma.clinicSettings.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.clinicSettings.create({ data: { userId } });
  },

  /** Actualiza campos parciales de la configuración (create si no existe). */
  async update(userId: string, data: ClinicSettingsData): Promise<ClinicSettings> {
    const existing = await prisma.clinicSettings.findUnique({ where: { userId } });
    if (existing) {
      return prisma.clinicSettings.update({
        where: { userId },
        data,
      });
    }
    return prisma.clinicSettings.create({
      data: { userId, ...data },
    });
  },
};
