import type { Patient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { IRepository } from "./base.repository";

/**
 * Repositorio para la entidad Patient.
 * Implementa CRUD base + métodos de dominio con filtro multi-tenant.
 */
export class PatientRepository implements IRepository<Patient> {
  async findById(id: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        _count: { select: { appointments: true } },
      },
    });
  }

  /**
   * Busca un paciente por ID con verificación de tenant
   * e incluye sus últimas 10 citas ordenadas por fecha descendente.
   */
  async findByIdWithAppointments(
    id: string,
    userId: string
  ): Promise<Patient | null> {
    return prisma.patient.findFirst({
      where: { id, userId },
      include: {
        appointments: {
          take: 10,
          orderBy: { date: "desc" },
        },
        _count: { select: { appointments: true } },
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<Patient[]> {
    return prisma.patient.findMany({
      skip: params?.skip,
      take: params?.take,
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Lista todos los pacientes de un dentista con el conteo de citas.
   */
  async findByDentist(userId: string): Promise<Patient[]> {
    return prisma.patient.findMany({
      where: { userId },
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Partial<Patient>): Promise<Patient> {
    return prisma.patient.create({
      data: {
        name: data.name!,
        phone: data.phone!,
        email: data.email ?? null,
        birthDate: data.birthDate ? new Date(data.birthDate as unknown as string) : null,
        notes: data.notes ?? null,
        userId: data.userId!,
      },
    });
  }

  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.patient.delete({ where: { id } });
  }
}

/** Instancia singleton del repositorio de pacientes. */
export const patientRepository = new PatientRepository();
