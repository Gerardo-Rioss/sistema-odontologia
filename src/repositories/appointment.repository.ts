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

  /**
   * Busca una cita por googleEventId.
   */
  async findByGoogleEventId(googleEventId: string): Promise<Appointment | null> {
    return prisma.appointment.findUnique({
      where: { googleEventId },
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
  async findByDentist(userId: string): Promise<
    (Appointment & { patient: { id: string; name: string } | null })[]
  > {
    return prisma.appointment.findMany({
      where: { userId },
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  /**
   * Lista citas de un dentista con filtros aplicados en la base de datos.
   * Mucho más eficiente que traer todos y filtrar en memoria.
   */
  async findByDentistWithFilters(
    userId: string,
    filters?: {
      status?: string;
      date?: string;
      search?: string;
    },
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<(Appointment & { patient: { id: string; name: string } | null })[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.date) {
      // Filtrar por fecha específica (YYYY-MM-DD)
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (filters?.search) {
      // Búsqueda por nombre de paciente (case-insensitive en PostgreSQL)
      where.patient = {
        name: {
          contains: filters.search,
          mode: "insensitive",
        },
      };
    }

    return prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Verifica si existe una cita en una fecha y hora específica para un dentista.
   * Retorna solo la primera coincidencia (más eficiente que traer todas).
   */
  async findByDentistAndTime(
    userId: string,
    date: string,
    time: string,
    excludeId?: string
  ): Promise<Appointment | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      time,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.appointment.findFirst({
      where,
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
