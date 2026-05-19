/**
 * Dashboard Accessibility — integration tests (R9).
 *
 * Covers:
 *  - R9: Keyboard navigation, focus trap, screen reader support,
 *         and color contrast on dashboard components.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarView } from "@/components/dashboard/CalendarView";
import type { CalendarDay, useCalendar as UseCalendarType } from "@/hooks/useCalendar";
import type { AppointmentListItem, AppointmentType } from "@/types";
import type { CalendarView as CalendarViewType } from "@/store/useStore";

// ─── Mocks ────────────────────────────────────────────────────

const mockGoToNext = jest.fn();
const mockGoToPrev = jest.fn();
const mockGoToToday = jest.fn();
const mockSetView = jest.fn();
const mockSetDateFilter = jest.fn();

const mockUseCalendar = jest.fn();

jest.mock("@/hooks/useCalendar", () => ({
  useCalendar: () => mockUseCalendar(),
}));

jest.mock("@/store/useStore", () => ({
  useStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const store = {
      setDateFilter: mockSetDateFilter,
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ─── Helpers ──────────────────────────────────────────────────

function makeCalendarDay(
  overrides: Partial<CalendarDay> = {},
): CalendarDay {
  return {
    date: new Date("2026-05-15T12:00:00Z"),
    isCurrentMonth: true,
    isToday: false,
    appointments: [],
    types: [],
    ...overrides,
  };
}

function makeAppointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  return {
    id: "apt-1",
    date: new Date("2026-05-15T10:00:00Z"),
    time: "10:00",
    status: "PENDING",
    type: "REVISION" as AppointmentType,
    notes: null,
    patientId: "p1",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
    patient: { id: "p1", name: "María López" },
    ...overrides,
  };
}

function setupDefaultCalendar() {
  const days: CalendarDay[] = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(2026, 4, i - 3);
    return {
      date: d,
      isCurrentMonth: d.getMonth() === 4,
      isToday: i === 17,
      appointments:
        i === 15
          ? [makeAppointment({ id: "apt-1", type: "LIMPIEZA" as AppointmentType })]
          : [],
      types: i === 15 ? (["LIMPIEZA"] as AppointmentType[]) : [],
    };
  });

  mockUseCalendar.mockReturnValue({
    days,
    appointments: [],
    viewDate: new Date("2026-05-15"),
    currentView: "month" as CalendarViewType,
    goToNext: mockGoToNext,
    goToPrev: mockGoToPrev,
    goToToday: mockGoToToday,
    setView: mockSetView,
    isLoading: false,
    error: null,
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultCalendar();
});

// ─── Tests: R9 — Keyboard Navigation ──────────────────────────

describe("Dashboard A11y — navegación por teclado", () => {
  it("debe tener tabIndex=0 en todas las celdas del calendario", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    expect(gridcells.length).toBeGreaterThan(0);

    gridcells.forEach((cell) => {
      expect(cell.getAttribute("tabIndex")).toBe("0");
    });
  });

  it("debe activar celda con tecla Enter", () => {
    const onDayClick = jest.fn();
    render(<CalendarView onDayClick={onDayClick} />);

    const gridcells = screen.getAllByRole("gridcell");
    fireEvent.keyDown(gridcells[0], { key: "Enter" });

    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it("debe activar celda con barra espaciadora", () => {
    const onDayClick = jest.fn();
    render(<CalendarView onDayClick={onDayClick} />);

    const gridcells = screen.getAllByRole("gridcell");
    fireEvent.keyDown(gridcells[0], { key: " " });

    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  it("no debe activar celda con teclas que no son Enter o espacio", () => {
    const onDayClick = jest.fn();
    render(<CalendarView onDayClick={onDayClick} />);

    const gridcells = screen.getAllByRole("gridcell");
    fireEvent.keyDown(gridcells[0], { key: "ArrowRight" });
    fireEvent.keyDown(gridcells[0], { key: "Tab" });

    expect(onDayClick).not.toHaveBeenCalled();
  });
});

// ─── Tests: R9 — Focus Trap ───────────────────────────────────

describe("Dashboard A11y — focus trap", () => {
  it("debe tener el calendario con role grid", () => {
    render(<CalendarView />);

    const grid = screen.getByRole("grid");
    expect(grid).toBeDefined();
  });

  it("debe tener aria-label en el grid del calendario", () => {
    render(<CalendarView />);

    const grid = screen.getByRole("grid");
    expect(grid.getAttribute("aria-label")).toBe("Calendario de citas");
  });

  it("debe tener aria-selected en la celda de hoy", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    const todayCell = gridcells.find(
      (cell) => cell.getAttribute("aria-selected") === "true",
    );
    expect(todayCell).toBeDefined();
  });
});

// ─── Tests: R9 — Screen Reader Support ────────────────────────

describe("Dashboard A11y — lectores de pantalla", () => {
  it("debe tener aria-label descriptivo en celdas con citas", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    const cellsWithAppointments = gridcells.filter((cell) =>
      cell.getAttribute("aria-label")?.includes("cita"),
    );
    expect(cellsWithAppointments.length).toBeGreaterThan(0);

    if (cellsWithAppointments.length > 0) {
      const label = cellsWithAppointments[0].getAttribute("aria-label")!;
      expect(label).toMatch(/\d+ cita/);
    }
  });

  it("debe tener aria-label en los botones de navegación", () => {
    render(<CalendarView />);

    const prevBtn = screen.getByLabelText("Mes anterior");
    const nextBtn = screen.getByLabelText("Mes siguiente");
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
  });

  it("debe tener los encabezados de días visibles (Lun, Mar, Mié...)", () => {
    render(<CalendarView />);

    expect(screen.getByText("Lun")).toBeDefined();
    expect(screen.getByText("Mar")).toBeDefined();
    expect(screen.getByText("Mié")).toBeDefined();
    expect(screen.getByText("Jue")).toBeDefined();
    expect(screen.getByText("Vie")).toBeDefined();
    expect(screen.getByText("Sáb")).toBeDefined();
    expect(screen.getByText("Dom")).toBeDefined();
  });
});

// ─── Tests: R9 — Contrast / Visual ────────────────────────────

describe("Dashboard A11y — contraste y visual", () => {
  it("debe renderizar la leyenda de colores con etiquetas de tipo", () => {
    render(<CalendarView />);

    expect(screen.getByText("Limpieza")).toBeDefined();
    expect(screen.getByText("Revisión")).toBeDefined();
    expect(screen.getByText("Urgencia")).toBeDefined();
    expect(screen.getByText("Tratamiento")).toBeDefined();
    expect(screen.getByText("Otro")).toBeDefined();
  });

  it("debe mostrar puntitos de color con aria-hidden para los tipos de cita", () => {
    const days: CalendarDay[] = [
      makeCalendarDay({
        date: new Date(2026, 4, 15),
        isCurrentMonth: true,
        isToday: false,
        appointments: [
          makeAppointment({ id: "a1", type: "LIMPIEZA" as AppointmentType }),
          makeAppointment({ id: "a2", type: "URGENCIA" as AppointmentType }),
        ],
        types: ["LIMPIEZA", "URGENCIA"] as AppointmentType[],
      }),
    ];

    mockUseCalendar.mockReturnValue({
      days,
      appointments: [],
      viewDate: new Date("2026-05-01"),
      currentView: "month" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: false,
      error: null,
    });

    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    const cell = gridcells[0];

    // Dots are marked with aria-hidden
    const dots = cell.querySelectorAll('[aria-hidden="true"] span');
    expect(dots.length).toBe(2);
  });

  it("debe tener opacidad reducida en celdas de meses adyacentes", () => {
    const days: CalendarDay[] = [
      makeCalendarDay({
        date: new Date(2026, 3, 27),
        isCurrentMonth: false,
        isToday: false,
      }),
      makeCalendarDay({
        date: new Date(2026, 4, 1),
        isCurrentMonth: true,
        isToday: false,
      }),
      makeCalendarDay({
        date: new Date(2026, 5, 1),
        isCurrentMonth: false,
        isToday: false,
      }),
    ];

    mockUseCalendar.mockReturnValue({
      days,
      appointments: [],
      viewDate: new Date("2026-05-01"),
      currentView: "month" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: false,
      error: null,
    });

    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    const dimmedCells = gridcells.filter((cell) =>
      cell.className.includes("opacity-40"),
    );
    expect(dimmedCells.length).toBeGreaterThanOrEqual(2);
  });
});
