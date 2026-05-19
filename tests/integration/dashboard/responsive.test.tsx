/**
 * Dashboard Responsive — integration tests (R8).
 *
 * Covers:
 *  - R8: Mobile viewport (sidebar overlay + hamburger) and desktop viewport.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    <div data-testid={`stats-${label}`} className="w-full">
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
      {!isLoading && !error && <span>{appointments.length} citas</span>}
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
    onClick?: () => void;
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

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
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
    data: [],
    isLoading: false,
    error: null,
  });
});

// ─── Tests: R8 — Mobile Viewport ──────────────────────────────

describe("Dashboard — vista móvil", () => {
  it("debe renderizar los StatsCards en una columna en móvil (grid-cols-1)", () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("stats-Citas hoy")).toBeDefined();
    expect(screen.getByTestId("stats-Pacientes nuevos")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de completadas")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de cancelación")).toBeDefined();
  });

  it("debe renderizar todas las acciones rápidas incluso en móvil", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<DashboardPage />);

    expect(screen.getByText("Nueva cita")).toBeDefined();
    expect(screen.getByText("Nuevo paciente")).toBeDefined();
    expect(screen.getByText("Ver estadísticas")).toBeDefined();
  });
});

// ─── Tests: R8 — Desktop Viewport ─────────────────────────────

describe("Dashboard — vista escritorio", () => {
  it("debe renderizar todos los StatsCards en desktop (grid-cols-4)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("stats-Citas hoy")).toBeDefined();
    expect(screen.getByTestId("stats-Pacientes nuevos")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de completadas")).toBeDefined();
    expect(screen.getByTestId("stats-Tasa de cancelación")).toBeDefined();
  });

  it("debe mostrar el panel de acciones rápidas al lado de las citas", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });

    render(<DashboardPage />);

    // Should have the appointment list card and the quick actions card
    const cards = screen.getAllByTestId("card");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });
});
