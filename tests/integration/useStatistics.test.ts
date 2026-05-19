/**
 * Tests unitarios para useStatistics hook.
 *
 * Verifica:
 *  - Cómputo de overview (total, today, patients, completionRate)
 *  - appointmentsByMonth (últimos 12 meses)
 *  - byType (distribución por tipo de cita)
 *  - byStatus (distribución por estado)
 *  - completionTrend (tasa mensual de completadas)
 *  - cancellationRate (tasa de cancelación)
 *  - newVsReturning (nuevos vs recurrentes)
 *  - Estados de carga y error
 *
 * Mockea useAppointments y usePatients.
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import { useStatistics } from "@/hooks/useStatistics";
import type { AppointmentListItem, AppointmentType, Patient } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockUseAppointments = jest.fn();
const mockUsePatients = jest.fn();

jest.mock("@/hooks/useAppointments", () => ({
  useAppointments: (...args: unknown[]) => mockUseAppointments(...args),
}));

jest.mock("@/hooks/usePatients", () => ({
  usePatients: (...args: unknown[]) => mockUsePatients(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────

function makeAppointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  const id = overrides.id ?? `apt-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    date: new Date(),
    time: "10:00",
    status: "PENDING",
    type: "REVISION" as AppointmentType,
    notes: null,
    patientId: "p1",
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: { id: "p1", name: "Paciente" },
    ...overrides,
  };
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    name: "Paciente Uno",
    email: null,
    phone: "555-0100",
    birthDate: null,
    notes: null,
    userId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppointments.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mockUsePatients.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
});

// ─── Tests: Overview ──────────────────────────────────────────

describe("useStatistics — overview", () => {
  it("debe computar totalAppointments del período (últimos 12 meses)", () => {
    const recentDate = new Date();
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", date: recentDate }),
        makeAppointment({ id: "a2", date: recentDate }),
        makeAppointment({ id: "a3", date: recentDate, status: "COMPLETED" }),
      ],
      isLoading: false,
      error: null,
    });
    mockUsePatients.mockReturnValue({
      data: [makePatient(), makePatient()],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { overview } = result.current;

    expect(overview.totalAppointments).toBe(3);
    expect(overview.totalPatients).toBe(2);
    expect(overview.appointmentsToday).toBe(3);
    expect(overview.completionRate).toBe(33);
  });

  it("debe devolver completionRate 0 cuando no hay citas", () => {
    const { result } = renderHook(() => useStatistics());
    const { overview } = result.current;

    expect(overview.totalAppointments).toBe(0);
    expect(overview.completionRate).toBe(0);
  });

  it("debe filtrar citas anteriores a 12 meses", () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    const recentDate = new Date();

    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "old", date: oldDate }),
        makeAppointment({ id: "recent", date: recentDate }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { overview } = result.current;

    expect(overview.totalAppointments).toBe(1);
  });
});

// ─── Tests: appointmentsByMonth ───────────────────────────────

describe("useStatistics — appointmentsByMonth", () => {
  it("debe devolver 12 meses con conteos correctos", () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);

    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", date: thisMonth }),
        makeAppointment({ id: "a2", date: thisMonth }),
        makeAppointment({ id: "a3", date: thisMonth }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { appointmentsByMonth } = result.current;

    expect(appointmentsByMonth).toHaveLength(12);
    const currentMonthData = appointmentsByMonth[11];
    expect(currentMonthData.count).toBe(3);
  });

  it("debe devolver conteo 0 para meses sin citas", () => {
    const { result } = renderHook(() => useStatistics());
    const { appointmentsByMonth } = result.current;

    appointmentsByMonth.forEach((m) => {
      expect(m.count).toBe(0);
    });
    expect(appointmentsByMonth).toHaveLength(12);
  });
});

// ─── Tests: byType ────────────────────────────────────────────

describe("useStatistics — byType", () => {
  it("debe agrupar citas por tipo con etiquetas en español", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", type: "LIMPIEZA" as AppointmentType }),
        makeAppointment({ id: "a2", type: "LIMPIEZA" as AppointmentType }),
        makeAppointment({ id: "a3", type: "URGENCIA" as AppointmentType }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { byType } = result.current;

    const limpieza = byType.find((t) => t.type === "Limpieza");
    const urgencia = byType.find((t) => t.type === "Urgencia");

    expect(limpieza).toBeDefined();
    expect(limpieza!.count).toBe(2);
    expect(urgencia).toBeDefined();
    expect(urgencia!.count).toBe(1);
  });

  it("debe devolver array vacío sin citas", () => {
    const { result } = renderHook(() => useStatistics());
    const { byType } = result.current;

    expect(byType).toHaveLength(0);
  });
});

// ─── Tests: byStatus ──────────────────────────────────────────

describe("useStatistics — byStatus", () => {
  it("debe agrupar citas por estado con etiquetas en español", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", status: "PENDING" }),
        makeAppointment({ id: "a2", status: "COMPLETED" }),
        makeAppointment({ id: "a3", status: "COMPLETED" }),
        makeAppointment({ id: "a4", status: "CANCELLED" }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { byStatus } = result.current;

    const pendiente = byStatus.find((s) => s.status === "Pendiente");
    const completada = byStatus.find((s) => s.status === "Completada");
    const cancelada = byStatus.find((s) => s.status === "Cancelada");

    expect(pendiente).toBeDefined();
    expect(pendiente!.count).toBe(1);
    expect(completada).toBeDefined();
    expect(completada!.count).toBe(2);
    expect(cancelada).toBeDefined();
    expect(cancelada!.count).toBe(1);
  });
});

// ─── Tests: completionTrend ───────────────────────────────────

describe("useStatistics — completionTrend", () => {
  it("debe devolver tasa de completadas por mes", () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10);

    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", date: thisMonth, status: "COMPLETED" }),
        makeAppointment({ id: "a2", date: thisMonth, status: "COMPLETED" }),
        makeAppointment({ id: "a3", date: thisMonth, status: "PENDING" }),
        makeAppointment({ id: "a4", date: thisMonth, status: "CANCELLED" }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { completionTrend } = result.current;

    expect(completionTrend).toHaveLength(12);
    const currentMonth = completionTrend[11];
    expect(currentMonth.rate).toBe(50);
  });

  it("debe devolver rate 0 para meses sin citas", () => {
    const { result } = renderHook(() => useStatistics());
    const { completionTrend } = result.current;

    completionTrend.forEach((p) => {
      expect(p.rate).toBe(0);
    });
  });
});

// ─── Tests: cancellationRate ──────────────────────────────────

describe("useStatistics — cancellationRate", () => {
  it("debe calcular el porcentaje de canceladas", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", status: "CANCELLED" }),
        makeAppointment({ id: "a2", status: "CANCELLED" }),
        makeAppointment({ id: "a3", status: "COMPLETED" }),
        makeAppointment({ id: "a4", status: "COMPLETED" }),
        makeAppointment({ id: "a5", status: "COMPLETED" }),
        makeAppointment({ id: "a6", status: "PENDING" }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.cancellationRate).toBe(33);
  });

  it("debe devolver 0 cuando no hay citas", () => {
    const { result } = renderHook(() => useStatistics());

    expect(result.current.cancellationRate).toBe(0);
  });
});

// ─── Tests: newVsReturning ────────────────────────────────────

describe("useStatistics — newVsReturning", () => {
  it("debe clasificar pacientes con 1 cita como nuevos", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", patientId: "p-new" }),
        makeAppointment({ id: "a2", patientId: "p-ret", status: "COMPLETED" }),
        makeAppointment({ id: "a3", patientId: "p-ret", status: "PENDING" }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { newVsReturning } = result.current;

    expect(newVsReturning.newPatients).toBe(1);
    expect(newVsReturning.returningPatients).toBe(1);
  });

  it("debe devolver ceros cuando no hay citas", () => {
    const { result } = renderHook(() => useStatistics());
    const { newVsReturning } = result.current;

    expect(newVsReturning.newPatients).toBe(0);
    expect(newVsReturning.returningPatients).toBe(0);
  });

  it("debe considerar todos como recurrentes si todos tienen ≥2 citas", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "a1", patientId: "p1" }),
        makeAppointment({ id: "a2", patientId: "p1" }),
        makeAppointment({ id: "a3", patientId: "p2" }),
        makeAppointment({ id: "a4", patientId: "p2" }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());
    const { newVsReturning } = result.current;

    expect(newVsReturning.newPatients).toBe(0);
    expect(newVsReturning.returningPatients).toBe(2);
  });
});

// ─── Tests: Estados de carga y error ──────────────────────────

describe("useStatistics — estados", () => {
  it("isLoading debe ser true si appointments está cargando", () => {
    mockUseAppointments.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUsePatients.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading debe ser true si patients está cargando", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUsePatients.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.isLoading).toBe(true);
  });

  it("debe propagar error de appointments", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Error de API"),
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.error).toBe("Error de API");
  });

  it("debe propagar error de patients si appointments no tiene error", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUsePatients.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Error de pacientes"),
    });

    const { result } = renderHook(() => useStatistics());

    expect(result.current.error).toBe("Error de pacientes");
  });
});
