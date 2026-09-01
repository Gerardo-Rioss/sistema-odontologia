/**
 * Tests for StatisticsService.
 *
 * Verifies:
 *  - getOverview returns complete StatisticsReturn shape
 *  - TYPE_LABELS mapping (LIMPIEZA→"Limpieza", etc.)
 *  - STATUS_LABELS mapping (COMPLETED→"Completada", etc.)
 *  - 12-month array with zero-fill
 *  - completionRate / cancellationRate math
 *  - newVsReturning split (1 appointment = new)
 *  - Spanish month labels via Intl.DateTimeFormat
 *  - Empty data returns zeroed defaults
 */

import { StatisticsService } from "@/services/statistics.service";
import type { IStatisticsRepository } from "@/services/types";

// ─── Mock Repository ──────────────────────────────────────────

function makeMockRepo(
  overrides: Partial<IStatisticsRepository> = {}
): IStatisticsRepository {
  const defaults: IStatisticsRepository = {
    getCounts: jest.fn().mockResolvedValue({
      totalAppointments: 0,
      appointmentsToday: 0,
      completedCount: 0,
    }),
    getTotalPatients: jest.fn().mockResolvedValue(0),
    getByMonth: jest.fn().mockResolvedValue([]),
    getByType: jest.fn().mockResolvedValue([]),
    getByStatus: jest.fn().mockResolvedValue([]),
    getPatientAppointmentCounts: jest.fn().mockResolvedValue([]),
  };
  return { ...defaults, ...overrides };
}

function zeroedRepo(): IStatisticsRepository {
  return makeMockRepo({
    getCounts: jest.fn().mockResolvedValue({
      totalAppointments: 0,
      appointmentsToday: 0,
      completedCount: 0,
    }),
    getTotalPatients: jest.fn().mockResolvedValue(0),
    getByMonth: jest.fn().mockResolvedValue([]),
    getByType: jest.fn().mockResolvedValue([]),
    getByStatus: jest.fn().mockResolvedValue([]),
    getPatientAppointmentCounts: jest.fn().mockResolvedValue([]),
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests: Shape ─────────────────────────────────────────────

describe("StatisticsService.getOverview — shape", () => {
  it("should return complete StatisticsReturn structure", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result).toHaveProperty("overview");
    expect(result).toHaveProperty("appointmentsByMonth");
    expect(result).toHaveProperty("byType");
    expect(result).toHaveProperty("byStatus");
    expect(result).toHaveProperty("completionTrend");
    expect(result).toHaveProperty("cancellationRate");
    expect(result).toHaveProperty("newVsReturning");
    expect(result).toHaveProperty("isLoading", false);
    expect(result).toHaveProperty("error", null);
  });

  it("should call repository with userId and correct date range", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    await service.getOverview("user-42");

    expect(repo.getCounts).toHaveBeenCalledWith(
      "user-42",
      expect.any(Date),
      expect.any(Date)
    );
    expect(repo.getTotalPatients).toHaveBeenCalledWith("user-42");
    expect(repo.getByMonth).toHaveBeenCalledWith("user-42", expect.any(Date));
    expect(repo.getByType).toHaveBeenCalledWith("user-42", expect.any(Date));
    expect(repo.getByStatus).toHaveBeenCalledWith("user-42", expect.any(Date));
    expect(repo.getPatientAppointmentCounts).toHaveBeenCalledWith(
      "user-42",
      expect.any(Date)
    );
  });
});

// ─── Tests: Overview ──────────────────────────────────────────

describe("StatisticsService.getOverview — overview", () => {
  it("should compute completionRate from repository counts", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 10,
        appointmentsToday: 2,
        completedCount: 7,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(5),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.overview.totalAppointments).toBe(10);
    expect(result.overview.totalPatients).toBe(5);
    expect(result.overview.appointmentsToday).toBe(2);
    expect(result.overview.completionRate).toBe(70);
  });

  it("should return completionRate 0 when no appointments", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.overview.completionRate).toBe(0);
  });
});

// ─── Tests: Type Labels ──────────────────────────────────────

describe("StatisticsService.getOverview — byType labels", () => {
  it("should map type enums to Spanish labels", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 3,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByType: jest.fn().mockResolvedValue([
        { type: "LIMPIEZA", count: 2 },
        { type: "REVISION", count: 1 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.byType).toEqual([
      { type: "Limpieza", count: 2 },
      { type: "Revisión", count: 1 },
    ]);
  });

  it("should map all five type labels", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 5,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByType: jest.fn().mockResolvedValue([
        { type: "LIMPIEZA", count: 1 },
        { type: "REVISION", count: 1 },
        { type: "URGENCIA", count: 1 },
        { type: "TRATAMIENTO", count: 1 },
        { type: "OTRO", count: 1 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    const labels = result.byType.map((t) => t.type);
    expect(labels).toContain("Limpieza");
    expect(labels).toContain("Revisión");
    expect(labels).toContain("Urgencia");
    expect(labels).toContain("Tratamiento");
    expect(labels).toContain("Otro");
  });
});

// ─── Tests: Status Labels ─────────────────────────────────────

describe("StatisticsService.getOverview — byStatus labels", () => {
  it("should map status enums to Spanish labels", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 4,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByStatus: jest.fn().mockResolvedValue([
        { status: "COMPLETED", count: 2 },
        { status: "PENDING", count: 1 },
        { status: "CANCELLED", count: 1 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.byStatus).toEqual([
      { status: "Completada", count: 2 },
      { status: "Pendiente", count: 1 },
      { status: "Cancelada", count: 1 },
    ]);
  });
});

// ─── Tests: Month Array ──────────────────────────────────────

describe("StatisticsService.getOverview — appointmentsByMonth", () => {
  it("should return 12-month array with zero-fill", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.appointmentsByMonth).toHaveLength(12);
    result.appointmentsByMonth.forEach((m) => {
      expect(m.count).toBe(0);
    });
  });

  it("should fill counts from repository data", async () => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 3,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByMonth: jest.fn().mockResolvedValue([
        { month: thisMonthKey, count: 3 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.appointmentsByMonth).toHaveLength(12);
    const currentMonth = result.appointmentsByMonth[11];
    expect(currentMonth.count).toBe(3);
  });

  it("should have Spanish month labels", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    // Labels should be in Spanish like "ene. 2026" or "enero 2026"
    result.appointmentsByMonth.forEach((m) => {
      expect(m.month).toMatch(/\d{4}/); // contains year
      expect(m.month.length).toBeGreaterThan(4); // not just the year
    });
  });
});

// ─── Tests: Completion Trend ─────────────────────────────────

describe("StatisticsService.getOverview — completionTrend", () => {
  it("should return 12-month completion trend", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.completionTrend).toHaveLength(12);
    result.completionTrend.forEach((p) => {
      expect(p).toHaveProperty("month");
      expect(p).toHaveProperty("rate", 0);
    });
  });

  it("should compute monthly completion rates from repository data", async () => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 4,
        appointmentsToday: 0,
        completedCount: 2,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByMonth: jest.fn().mockResolvedValue([
        { month: thisMonthKey, count: 4 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    const currentMonth = result.completionTrend[11];
    // 2 completed out of 4 total = 50%
    expect(currentMonth.rate).toBe(50);
  });
});

// ─── Tests: Cancellation Rate ────────────────────────────────

describe("StatisticsService.getOverview — cancellationRate", () => {
  it("should compute cancellation rate from repository counts", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 6,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getByStatus: jest.fn().mockResolvedValue([
        { status: "CANCELLED", count: 2 },
        { status: "COMPLETED", count: 3 },
        { status: "PENDING", count: 1 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    // 2 cancelled out of 6 = 33%
    expect(result.cancellationRate).toBe(33);
  });

  it("should return 0 when no appointments", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.cancellationRate).toBe(0);
  });
});

// ─── Tests: New vs Returning ─────────────────────────────────

describe("StatisticsService.getOverview — newVsReturning", () => {
  it("should classify patients with exactly 1 appointment as new", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 4,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getPatientAppointmentCounts: jest.fn().mockResolvedValue([
        { patientId: "p-new", count: 1 },
        { patientId: "p-ret", count: 3 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.newVsReturning.newPatients).toBe(1);
    expect(result.newVsReturning.returningPatients).toBe(1);
  });

  it("should return zeros when no patient data", async () => {
    const repo = zeroedRepo();
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.newVsReturning.newPatients).toBe(0);
    expect(result.newVsReturning.returningPatients).toBe(0);
  });

  it("should treat all as returning when all have 2+ appointments", async () => {
    const repo = makeMockRepo({
      getCounts: jest.fn().mockResolvedValue({
        totalAppointments: 4,
        appointmentsToday: 0,
        completedCount: 0,
      }),
      getTotalPatients: jest.fn().mockResolvedValue(0),
      getPatientAppointmentCounts: jest.fn().mockResolvedValue([
        { patientId: "p1", count: 2 },
        { patientId: "p2", count: 3 },
      ]),
    });
    const service = new StatisticsService(repo);

    const result = await service.getOverview("user-1");

    expect(result.newVsReturning.newPatients).toBe(0);
    expect(result.newVsReturning.returningPatients).toBe(2);
  });
});
