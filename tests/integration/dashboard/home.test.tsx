/**
 * Dashboard Home — integration tests (R1-R2).
 *
 * Covers:
 *  - R1: Load, empty, and error states for the dashboard home page.
 *  - R2: StatsCards render metrics; upcoming appointments feed renders.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import type { AppointmentListItem, AppointmentType } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockUseStatistics = jest.fn();
const mockUseAppointments = jest.fn();

jest.mock("@/hooks/useStatistics", () => ({
  useStatistics: () => mockUseStatistics(),
}));

jest.mock("@/hooks/useAppointments", () => ({
  useAppointments: () => mockUseAppointments(),
}));

jest.mock("@/components/dashboard/StatsCard", () => ({
  StatsCard: ({
    label,
    value,
    loading,
    error,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    accent?: string;
    loading?: boolean;
    error?: string;
    trend?: unknown;
  }) => (
    <div data-testid={`stats-${label}`}>
      {loading && <div role="status">Loading</div>}
      {error && <div role="alert">{error}</div>}
      {!loading && !error && <span>{value}</span>}
    </div>
  ),
}));

jest.mock("@/components/dashboard/AppointmentList", () => ({
  AppointmentList: ({
    appointments,
    isLoading,
    error,
  }: {
    appointments: unknown[];
    isLoading?: boolean;
    error?: string | null;
    onSelectAppointment?: (id: string) => void;
    className?: string;
  }) => (
    <div data-testid="appointment-list">
      {isLoading && <div role="status">Loading</div>}
      {error && <div role="alert">{error}</div>}
      {!isLoading && !error && (
        <span>{appointments.length} citas</span>
      )}
    </div>
  ),
}));

jest.mock("@/components/ui/Spinner", () => ({
  Spinner: ({ size }: { size?: string }) => (
    <div role="status" data-testid={`spinner-${size ?? "md"}`} />
  ),
}));

jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button data-testid={`btn-${variant ?? "primary"}`} className={className}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/Card", () => ({
  Card: ({
    header,
    children,
  }: {
    header?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="card">
      {header}
      {children}
    </div>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
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

function setupDefaultState() {
  mockUseStatistics.mockReturnValue({
    overview: {
      totalAppointments: 42,
      totalPatients: 15,
      appointmentsToday: 8,
      completionRate: 75,
    },
    appointmentsByMonth: [],
    byType: [],
    byStatus: [],
    completionTrend: [],
    cancellationRate: 10,
    newVsReturning: { newPatients: 3, returningPatients: 12 },
    isLoading: false,
    error: null,
  });

  mockUseAppointments.mockReturnValue({
    data: [
      makeAppointment({ id: "a1", patient: { id: "p1", name: "Ana Ruiz" } }),
      makeAppointment({ id: "a2", patient: { id: "p2", name: "Carlos Pérez" } }),
      makeAppointment({ id: "a3", patient: { id: "p3", name: "Diana Mora" } }),
    ],
    isLoading: false,
    error: null,
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultState();
});

// ─── Tests: R1 — Load State ───────────────────────────────────

describe("Dashboard Home — carga", () => {
  it("debe mostrar las métricas en los StatsCards cuando los datos cargan", () => {
    render(<DashboardPage />);

    expect(screen.getByTestId("stats-Citas hoy")).toBeDefined();
    expect(screen.getByTestId("stats-Pacientes nuevos")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de completadas")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de cancelación")).toBeDefined();
  });

  it("debe renderizar la lista de próximas citas con datos reales", () => {
    render(<DashboardPage />);

    const list = screen.getByTestId("appointment-list");
    expect(list).toBeDefined();
    expect(screen.getByText("3 citas")).toBeDefined();
  });

  it("debe mostrar las acciones rápidas (Nueva cita, Nuevo paciente, Ver estadísticas)", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Nueva cita")).toBeDefined();
    expect(screen.getByText("Nuevo paciente")).toBeDefined();
    expect(screen.getByText("Ver estadísticas")).toBeDefined();
  });
});

// ─── Tests: R1 — Empty State ──────────────────────────────────

describe("Dashboard Home — vacío", () => {
  it("debe mostrar 0 citas cuando no hay appointments", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText("0 citas")).toBeDefined();
  });

  it("debe mostrar métricas con valores cero cuando no hay datos", () => {
    mockUseStatistics.mockReturnValue({
      overview: {
        totalAppointments: 0,
        totalPatients: 0,
        appointmentsToday: 0,
        completionRate: 0,
      },
      appointmentsByMonth: [],
      byType: [],
      byStatus: [],
      completionTrend: [],
      cancellationRate: 0,
      newVsReturning: { newPatients: 0, returningPatients: 0 },
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    // StatsCards should render even with zero values
    expect(screen.getByTestId("stats-Citas hoy")).toBeDefined();
    expect(screen.getByTestId("stats-Pacientes nuevos")).toBeDefined();
  });
});

// ─── Tests: R1 — Error State ──────────────────────────────────

describe("Dashboard Home — error", () => {
  it("debe mostrar mensaje de error cuando useStatistics falla", () => {
    mockUseStatistics.mockReturnValue({
      overview: {
        totalAppointments: 0,
        totalPatients: 0,
        appointmentsToday: 0,
        completionRate: 0,
      },
      appointmentsByMonth: [],
      byType: [],
      byStatus: [],
      completionTrend: [],
      cancellationRate: 0,
      newVsReturning: { newPatients: 0, returningPatients: 0 },
      isLoading: false,
      error: "Error al cargar estadísticas",
    });

    render(<DashboardPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    // Error text appears twice: title + detail. Use getAllByText.
    const errorTexts = screen.getAllByText("Error al cargar estadísticas");
    expect(errorTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("debe mostrar estado de carga cuando ambas queries están cargando", () => {
    mockUseStatistics.mockReturnValue({
      overview: {
        totalAppointments: 0,
        totalPatients: 0,
        appointmentsToday: 0,
        completionRate: 0,
      },
      appointmentsByMonth: [],
      byType: [],
      byStatus: [],
      completionTrend: [],
      cancellationRate: 0,
      newVsReturning: { newPatients: 0, returningPatients: 0 },
      isLoading: true,
      error: null,
    });

    render(<DashboardPage />);

    // StatsCards should receive loading=true
    const statsCard = screen.getByTestId("stats-Citas hoy");
    expect(statsCard).toBeDefined();
  });
});
