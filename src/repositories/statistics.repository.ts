import { prisma } from "@/lib/prisma";
import type { IStatisticsRepository } from "@/services/types";

/**
 * Repository for dashboard statistics queries.
 *
 * Uses Prisma aggregate/groupBy for efficient server-side computation.
 * All queries are scoped by userId (multi-tenant).
 */
export class StatisticsRepository implements IStatisticsRepository {
  /**
   * Returns total appointments in period, today's count, and completed count.
   */
  async getCounts(
    userId: string,
    cutoff: Date,
    today: Date
  ): Promise<{
    totalAppointments: number;
    appointmentsToday: number;
    completedCount: number;
  }> {
    const [totalResult, todayResult, completedResult] = await Promise.all([
      prisma.appointment.aggregate({
        where: { userId, date: { gte: cutoff } },
        _count: { id: true },
      }),
      prisma.appointment.aggregate({
        where: { userId, date: today },
        _count: { id: true },
      }),
      prisma.appointment.aggregate({
        where: { userId, date: { gte: cutoff }, status: "COMPLETED" },
        _count: { id: true },
      }),
    ]);

    return {
      totalAppointments: totalResult._count.id,
      appointmentsToday: todayResult._count.id,
      completedCount: completedResult._count.id,
    };
  }

  /**
   * Returns total patient count for the given user.
   */
  async getTotalPatients(userId: string): Promise<number> {
    return prisma.patient.count({ where: { userId } });
  }

  /**
   * Returns raw dates of all appointments in period for month grouping.
   * Month extraction (YYYY-MM) is done in the service layer to avoid
   * Prisma groupBy limitations with @db.Date.
   */
  async getByMonth(
    userId: string,
    cutoff: Date
  ): Promise<{ month: string; count: number }[]> {
    const appointments = await prisma.appointment.findMany({
      where: { userId, date: { gte: cutoff } },
      select: { date: true },
    });

    // Group by YYYY-MM using toISOString (safe for midnight UTC dates)
    const grouped: Record<string, number> = {};
    for (const a of appointments) {
      const key = a.date.toISOString().slice(0, 7);
      grouped[key] = (grouped[key] ?? 0) + 1;
    }

    return Object.entries(grouped).map(([month, count]) => ({ month, count }));
  }

  /**
   * Returns appointment counts grouped by type.
   */
  async getByType(
    userId: string,
    cutoff: Date
  ): Promise<{ type: string; count: number }[]> {
    const results = await prisma.appointment.groupBy({
      by: ["type"],
      where: { userId, date: { gte: cutoff } },
      _count: { id: true },
    });

    return results.map((r) => ({ type: r.type, count: r._count.id }));
  }

  /**
   * Returns appointment counts grouped by status.
   */
  async getByStatus(
    userId: string,
    cutoff: Date
  ): Promise<{ status: string; count: number }[]> {
    const results = await prisma.appointment.groupBy({
      by: ["status"],
      where: { userId, date: { gte: cutoff } },
      _count: { id: true },
    });

    return results.map((r) => ({ status: r.status, count: r._count.id }));
  }

  /**
   * Returns per-patient appointment counts for new vs returning classification.
   */
  async getPatientAppointmentCounts(
    userId: string,
    cutoff: Date
  ): Promise<{ patientId: string; count: number }[]> {
    const results = await prisma.appointment.groupBy({
      by: ["patientId"],
      where: { userId, date: { gte: cutoff } },
      _count: { id: true },
    });

    return results.map((r) => ({
      patientId: r.patientId,
      count: r._count.id,
    }));
  }
}

/** Singleton instance of the statistics repository. */
export const statisticsRepository = new StatisticsRepository();
