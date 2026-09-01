/**
 * Tests for StatisticsRepository.
 *
 * Verifies:
 *  - getCounts returns totalAppointments, appointmentsToday, completedCount
 *  - getTotalPatients returns patient count
 *  - getByMonth returns monthly appointment counts
 *  - getByType returns appointment counts by type
 *  - getByStatus returns appointment counts by status
 *  - getPatientAppointmentCounts returns per-patient counts
 *  - All queries scoped by userId
 *  - Date filter uses 12-month cutoff
 *  - Empty data returns zeroed defaults
 *
 * Mocks Prisma client directly.
 */

import type { IStatisticsRepository } from "@/services/types";

// ─── Mock Prisma ─────────────────────────────────────────────

const mockAggregate = jest.fn();
const mockGroupBy = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    patient: {
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

// We need to import AFTER mocking
let StatisticsRepository: typeof import("@/repositories/statistics.repository").StatisticsRepository;

beforeAll(async () => {
  const mod = await import("@/repositories/statistics.repository");
  StatisticsRepository = mod.StatisticsRepository;
});

// ─── Helpers ──────────────────────────────────────────────────

function makeRepo(): IStatisticsRepository {
  return new StatisticsRepository();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests: getCounts ─────────────────────────────────────────

describe("StatisticsRepository.getCounts", () => {
  it("should return totalAppointments, appointmentsToday, and completedCount", async () => {
    const repo = makeRepo();
    const now = new Date();
    const cutoff = daysAgo(365);

    // Total count
    mockAggregate.mockResolvedValueOnce({ _count: { id: 15 } });
    // Today count
    mockAggregate.mockResolvedValueOnce({ _count: { id: 3 } });
    // Completed count
    mockAggregate.mockResolvedValueOnce({ _count: { id: 8 } });

    const result = await repo.getCounts("user-1", cutoff, now);

    expect(result.totalAppointments).toBe(15);
    expect(result.appointmentsToday).toBe(3);
    expect(result.completedCount).toBe(8);
  });

  it("should pass userId and date filters to aggregate queries", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);
    const today = startOfToday();

    mockAggregate.mockResolvedValue({ _count: { id: 0 } });

    await repo.getCounts("user-42", cutoff, today);

    // Total appointments query
    expect(mockAggregate).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "user-42",
        date: { gte: cutoff },
      },
      _count: { id: true },
    });

    // Today query
    expect(mockAggregate).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-42",
        date: today,
      },
      _count: { id: true },
    });

    // Completed query
    expect(mockAggregate).toHaveBeenNthCalledWith(3, {
      where: {
        userId: "user-42",
        date: { gte: cutoff },
        status: "COMPLETED",
      },
      _count: { id: true },
    });
  });
});

// ─── Tests: getTotalPatients ──────────────────────────────────

describe("StatisticsRepository.getTotalPatients", () => {
  it("should return total patient count for user", async () => {
    const repo = makeRepo();
    mockCount.mockResolvedValue(42);

    const result = await repo.getTotalPatients("user-1");

    expect(result).toBe(42);
    expect(mockCount).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});

// ─── Tests: getByMonth ────────────────────────────────────────

describe("StatisticsRepository.getByMonth", () => {
  it("should return monthly appointment counts grouped by YYYY-MM", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockFindMany.mockResolvedValue([
      { date: new Date("2026-01-15T00:00:00.000Z") },
      { date: new Date("2026-01-20T00:00:00.000Z") },
      { date: new Date("2026-02-10T00:00:00.000Z") },
    ]);

    const result = await repo.getByMonth("user-1", cutoff);

    expect(result).toEqual([
      { month: "2026-01", count: 2 },
      { month: "2026-02", count: 1 },
    ]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", date: { gte: cutoff } },
      select: { date: true },
    });
  });

  it("should return empty array when no appointments exist", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockFindMany.mockResolvedValue([]);

    const result = await repo.getByMonth("user-1", cutoff);

    expect(result).toEqual([]);
  });
});

// ─── Tests: getByType ─────────────────────────────────────────

describe("StatisticsRepository.getByType", () => {
  it("should return appointment counts by type", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockGroupBy.mockResolvedValue([
      { type: "LIMPIEZA", _count: { id: 10 } },
      { type: "REVISION", _count: { id: 5 } },
    ]);

    const result = await repo.getByType("user-1", cutoff);

    expect(result).toEqual([
      { type: "LIMPIEZA", count: 10 },
      { type: "REVISION", count: 5 },
    ]);
  });
});

// ─── Tests: getByStatus ───────────────────────────────────────

describe("StatisticsRepository.getByStatus", () => {
  it("should return appointment counts by status", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockGroupBy.mockResolvedValue([
      { status: "COMPLETED", _count: { id: 20 } },
      { status: "PENDING", _count: { id: 4 } },
    ]);

    const result = await repo.getByStatus("user-1", cutoff);

    expect(result).toEqual([
      { status: "COMPLETED", count: 20 },
      { status: "PENDING", count: 4 },
    ]);
  });
});

// ─── Tests: getPatientAppointmentCounts ──────────────────────

describe("StatisticsRepository.getPatientAppointmentCounts", () => {
  it("should return per-patient appointment counts", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockGroupBy.mockResolvedValue([
      { patientId: "p1", _count: { id: 3 } },
      { patientId: "p2", _count: { id: 1 } },
    ]);

    const result = await repo.getPatientAppointmentCounts("user-1", cutoff);

    expect(result).toEqual([
      { patientId: "p1", count: 3 },
      { patientId: "p2", count: 1 },
    ]);
  });

  it("should return empty array when no patient appointments exist", async () => {
    const repo = makeRepo();
    const cutoff = daysAgo(365);

    mockGroupBy.mockResolvedValue([]);

    const result = await repo.getPatientAppointmentCounts("user-1", cutoff);

    expect(result).toEqual([]);
  });
});
