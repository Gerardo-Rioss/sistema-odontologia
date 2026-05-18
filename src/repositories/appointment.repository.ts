import type { Appointment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { IRepository } from "./base.repository";

/**
 * Repositorio para la entidad Appointment.
 * Implementa CRUD base + métodos de dominio con filtro multi-tenant.
 */
export class AppointmentRepository implements IRepository<Appointment> {
  async findById(id: string): Promise<Appointment | null> {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Busca una cita por ID con verificación de tenant.
   * Lanza un error si la cita no pertenece al usuario.
   */
  async findByIdWithPatient(
    id: string,
    userId: string
  ): Promise<Appointment | null> {
    return prisma.appointment.findFirst({
      where: { id, userId },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      skip: params?.skip,
      take: params?.take,
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Lista todas las citas de un dentista con el nombre del paciente incluido.
   */
  async findByDentist(userId: string): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: { userId },
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async create(data: Partial<Appointment>): Promise<Appointment> {
    return prisma.appointment.create({
      data: {
        date: data.date!,
        time: data.time!,
        type: data.type!,
        patientId: data.patientId!,
        userId: data.userId!,
        status: data.status ?? "PENDING",
        notes: data.notes ?? null,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    id: string,
    data: Partial<Appointment>
  ): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.appointment.delete({ where: { id } });
  }
}

/** Instancia singleton del repositorio de citas. */
export const appointmentRepository = new AppointmentRepository();
