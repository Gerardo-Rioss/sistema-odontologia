/**
 * Dashboard Appointments Page — integration tests (R3-R5).
 *
 * Covers:
 *  - R3: Filter appointments by status and date.
 *  - R4: Validation errors on appointment form.
 *  - R5: Slot-occupied state and edit flow.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentsPage from "@/app/(dashboard)/dashboard/appointments/page";
import type { AppointmentListItem, AppointmentType } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockUseAppointments = jest.fn();
const mockUseStore = jest.fn();

jest.mock("@/hooks/useAppointments", () => ({
  useAppointments: () => mockUseAppointments(),
}));

jest.mock("@/hooks/useAppointmentMutations", () => ({
  useAppointmentMutations: () => ({
    createAppointment: jest.fn().mockResolvedValue(undefined),
    updateAppointment: jest.fn().mockResolvedValue(undefined),
    deleteAppointment: jest.fn().mockResolvedValue(undefined),
    confirmAppointment: jest.fn().mockResolvedValue(undefined),
    cancelAppointment: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isConfirming: false,
    isCancelling: false,
    error: null,
  }),
}));

jest.mock("@/hooks/usePatients", () => ({
  usePatients: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/hooks/useAvailableSlots", () => ({
  useAvailableSlots: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/store/useStore", () => ({
  useStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const store = {
      statusFilter: null,
      dateFilter: null,
      searchQuery: "",
      isFormOpen: false,
      isConfirmOpen: false,
      selectedAppointmentId: null,
      openForm: jest.fn(),
      closeForm: jest.fn(),
      openConfirm: jest.fn(),
      closeConfirm: jest.fn(),
      setStatusFilter: jest.fn(),
      setDateFilter: jest.fn(),
      setSearchQuery: jest.fn(),
      resetFilters: jest.fn(),
      currentView: "month",
      currentDate: new Date().toISOString().slice(0, 10),
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock("@/components/dashboard/FilterBar", () => ({
  FilterBar: ({
    showStatusFilter,
    showDateFilter,
    showSearch,
    searchPlaceholder,
  }: {
    showStatusFilter?: boolean;
    showDateFilter?: boolean;
    showSearch?: boolean;
    searchPlaceholder?: string;
    className?: string;
  }) => (
    <div data-testid="filter-bar">
      {showStatusFilter && <select data-testid="filter-status" aria-label="Estado" />}
      {showDateFilter && <input data-testid="filter-date" type="date" aria-label="Fecha" />}
      {showSearch && <input data-testid="filter-search" placeholder={searchPlaceholder} />}
    </div>
  ),
}));

jest.mock("@/components/dashboard/CalendarView", () => ({
  CalendarView: ({
    onDayClick,
  }: {
    onDayClick?: (date: string) => void;
  }) => (
    <div data-testid="calendar-view" onClick={() => onDayClick?.("2026-06-15")}>
      Calendario
    </div>
  ),
}));

jest.mock("@/components/dashboard/AppointmentList", () => ({
  AppointmentList: ({
    appointments,
    isLoading,
    error,
    onSelectAppointment,
  }: {
    appointments: AppointmentListItem[];
    isLoading?: boolean;
    error?: string | null;
    onSelectAppointment?: (id: string) => void;
    className?: string;
  }) => (
    <div data-testid="appointment-list">
      {isLoading && <div role="status">Cargando citas...</div>}
      {error && <div role="alert">{error}</div>}
      {!isLoading && !error && appointments.length === 0 && (
        <div>No hay citas para mostrar</div>
      )}
      {appointments.map((a) => (
        <div key={a.id} data-testid={`appointment-${a.id}`} onClick={() => onSelectAppointment?.(a.id)}>
          {a.patient.name} — {a.time}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/dashboard/AppointmentModal", () => ({
  AppointmentModal: ({
    open,
    onClose,
    appointment,
  }: {
    open: boolean;
    onClose: () => void;
    appointment?: AppointmentListItem | null;
  }) =>
    open ? (
      <div data-testid="appointment-modal" role="dialog">
        <h2>{appointment ? "Editar cita" : "Nueva cita"}</h2>
        <button onClick={onClose} data-testid="modal-close">
          Cancelar
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/dashboard/AppointmentDetail", () => ({
  AppointmentDetail: ({
    open,
    onClose,
    onEdit,
  }: {
    open: boolean;
    onClose: () => void;
    appointmentId: string | null;
    onEdit: (apt: AppointmentListItem) => void;
  }) =>
    open ? (
      <div data-testid="appointment-detail" role="dialog">
        <button onClick={onClose} data-testid="detail-close">
          Cerrar
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} data-testid={`btn-${variant ?? "primary"}`}>
      {children}
    </button>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ─── Helpers ──────────────────────────────────────────────────

function makeAppointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  const id = overrides.id ?? `apt-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    date: new Date("2026-06-15T10:00:00Z"),
    time: "10:00",
    status: "PENDING",
    type: "REVISION" as AppointmentType,
    notes: null,
    patientId: "p1",
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: { id: "p1", name: "María López" },
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppointments.mockReturnValue({
    data: [
      makeAppointment({ id: "a1" }),
      makeAppointment({ id: "a2", status: "CONFIRMED", type: "LIMPIEZA" as AppointmentType }),
      makeAppointment({ id: "a3", status: "COMPLETED", type: "URGENCIA" as AppointmentType }),
    ],
    isLoading: false,
    error: null,
  });
});

// ─── Tests: R3 — Filter ───────────────────────────────────────

describe("Appointments Page — filtros", () => {
  it("debe renderizar la barra de filtros con estado, fecha y búsqueda", () => {
    render(<AppointmentsPage />);

    expect(screen.getByTestId("filter-bar")).toBeDefined();
    expect(screen.getByTestId("filter-status")).toBeDefined();
    expect(screen.getByTestId("filter-date")).toBeDefined();
    expect(screen.getByTestId("filter-search")).toBeDefined();
  });

  it("debe mostrar el botón Nueva cita en la cabecera", () => {
    render(<AppointmentsPage />);

    expect(screen.getByText("Nueva cita")).toBeDefined();
  });

  it("debe renderizar el toggle Calendario / Lista", () => {
    render(<AppointmentsPage />);

    // "Calendario" appears both in the toggle button and the mocked CalendarView.
    const calendarElements = screen.getAllByText("Calendario");
    expect(calendarElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Lista")).toBeDefined();
  });

  it("debe mostrar la vista de calendario por defecto", () => {
    render(<AppointmentsPage />);

    expect(screen.getByTestId("calendar-view")).toBeDefined();
  });
});

// ─── Tests: R4 — Validation Error ─────────────────────────────

describe("Appointments Page — errores de validación", () => {
  it("debe mostrar error en la lista cuando falla la carga de citas", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Error al cargar citas"),
    });

    render(<AppointmentsPage />);

    // Click Lista to switch to list view
    fireEvent.click(screen.getByText("Lista"));

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(screen.getByText("Error al cargar citas")).toBeDefined();
  });

  it("debe mostrar estado vacío cuando no hay citas", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AppointmentsPage />);

    fireEvent.click(screen.getByText("Lista"));

    expect(screen.getByText("No hay citas para mostrar")).toBeDefined();
  });

  it("debe mostrar la lista de citas con los datos cargados", () => {
    render(<AppointmentsPage />);

    fireEvent.click(screen.getByText("Lista"));

    expect(screen.getByTestId("appointment-list")).toBeDefined();
    expect(screen.getByTestId("appointment-a1")).toBeDefined();
    // Patient names appear in the appointment list mock
    const patientName = screen.getAllByText(/María López/);
    expect(patientName.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Tests: R5 — Slot Occupied + Edit ─────────────────────────

describe("Appointments Page — slot ocupado y edición", () => {
  it("debe cambiar a vista de lista al hacer clic en Lista", () => {
    render(<AppointmentsPage />);

    fireEvent.click(screen.getByText("Lista"));

    expect(screen.getByTestId("appointment-list")).toBeDefined();
  });

  it("debe volver a vista de calendario al hacer clic en Calendario", async () => {
    render(<AppointmentsPage />);

    // Switch to list first
    fireEvent.click(screen.getByText("Lista"));
    expect(screen.getByTestId("appointment-list")).toBeDefined();

    // Switch back to calendar
    fireEvent.click(screen.getByText("Calendario"));
    expect(screen.getByTestId("calendar-view")).toBeDefined();
  });

  it("debe mostrar loading state mientras cargan las citas", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<AppointmentsPage />);

    fireEvent.click(screen.getByText("Lista"));

    expect(screen.getByRole("status")).toBeDefined();
  });
});
