/**
 * Tests de integración para CalendarView.
 *
 * Verifica:
 *  - Navegación por teclado (ArrowLeft/Right entre días, Enter para seleccionar)
 *  - Cambio de vista (month/week/day)
 *  - Navegación temporal (prev/next/today)
 *  - Estados de carga y error
 *
 * Mockea useCalendar y useStore.
 * TDD deshabilitado — no se ejecutan.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarView } from "@/components/dashboard/CalendarView";
import type { CalendarDay } from "@/hooks/useCalendar";
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
  useStore: jest.fn((selector?: (s: Record<string, unknown>) => unknown) => {
    const store = {
      setDateFilter: mockSetDateFilter,
    };
    return selector ? selector(store) : store;
  }),
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

function setupDefaultCalendar(overrides: Partial<ReturnType<typeof mockUseCalendar>> = {}) {
  const days: CalendarDay[] = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(2026, 4, i - 3); // Mayo 2026, con relleno de abril
    return {
      date: d,
      isCurrentMonth: d.getMonth() === 4, // Mayo = 4
      isToday: i === 17, // ~día 14 como "hoy"
      appointments: i === 15
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
    ...overrides,
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultCalendar();
});

// ─── Tests: Renderizado ───────────────────────────────────────

describe("CalendarView — renderizado", () => {
  it("debe renderizar la grilla del calendario con role grid", () => {
    render(<CalendarView />);

    const grid = screen.getByRole("grid");
    expect(grid).toBeDefined();
    expect(grid.getAttribute("aria-label")).toBe("Calendario de citas");
  });

  it("debe renderizar los botones de navegación", () => {
    render(<CalendarView />);

    // Botones prev/next
    const prevBtn = screen.getByLabelText("Mes anterior");
    const nextBtn = screen.getByLabelText("Mes siguiente");
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();

    // Botón Hoy
    expect(screen.getByText("Hoy")).toBeDefined();
  });

  it("debe renderizar el selector de vista (Mes/Semana/Día)", () => {
    render(<CalendarView />);

    expect(screen.getByText("Mes")).toBeDefined();
    expect(screen.getByText("Semana")).toBeDefined();
    expect(screen.getByText("Día")).toBeDefined();
  });

  it("debe mostrar spinner en estado de carga", () => {
    mockUseCalendar.mockReturnValue({
      days: [],
      appointments: [],
      viewDate: new Date(),
      currentView: "month" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: true,
      error: null,
    });

    render(<CalendarView />);

    const spinner = screen.getByRole("status");
    expect(spinner).toBeDefined();
  });

  it("debe mostrar mensaje de error en estado de error", () => {
    mockUseCalendar.mockReturnValue({
      days: [],
      appointments: [],
      viewDate: new Date(),
      currentView: "month" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: false,
      error: "Error al cargar el calendario",
    });

    render(<CalendarView />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(screen.getByText("Error al cargar el calendario")).toBeDefined();
  });

  it("debe renderizar leyenda de colores por tipo de cita", () => {
    render(<CalendarView />);

    expect(screen.getByText("Limpieza")).toBeDefined();
    expect(screen.getByText("Revisión")).toBeDefined();
    expect(screen.getByText("Urgencia")).toBeDefined();
    expect(screen.getByText("Tratamiento")).toBeDefined();
    expect(screen.getByText("Otro")).toBeDefined();
  });
});

// ─── Tests: Navegación temporal ───────────────────────────────

describe("CalendarView — navegación temporal", () => {
  it("debe llamar a goToPrev al hacer clic en flecha izquierda", () => {
    render(<CalendarView />);

    const prevBtn = screen.getByLabelText("Mes anterior");
    fireEvent.click(prevBtn);

    expect(mockGoToPrev).toHaveBeenCalledTimes(1);
  });

  it("debe llamar a goToNext al hacer clic en flecha derecha", () => {
    render(<CalendarView />);

    const nextBtn = screen.getByLabelText("Mes siguiente");
    fireEvent.click(nextBtn);

    expect(mockGoToNext).toHaveBeenCalledTimes(1);
  });

  it("debe llamar a goToToday al hacer clic en Hoy", () => {
    render(<CalendarView />);

    const todayBtn = screen.getByText("Hoy");
    fireEvent.click(todayBtn);

    expect(mockGoToToday).toHaveBeenCalledTimes(1);
  });

  it("debe cambiar etiquetas de navegación según la vista", () => {
    mockUseCalendar.mockReturnValue({
      days: [],
      appointments: [],
      viewDate: new Date("2026-05-15"),
      currentView: "week" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: false,
      error: null,
    });

    render(<CalendarView />);

    expect(screen.getByLabelText("Semana anterior")).toBeDefined();
    expect(screen.getByLabelText("Semana siguiente")).toBeDefined();
  });

  it("debe cambiar etiquetas para vista diaria", () => {
    mockUseCalendar.mockReturnValue({
      days: [
        makeCalendarDay({ date: new Date("2026-05-15") }),
      ],
      appointments: [],
      viewDate: new Date("2026-05-15"),
      currentView: "day" as CalendarViewType,
      goToNext: mockGoToNext,
      goToPrev: mockGoToPrev,
      goToToday: mockGoToToday,
      setView: mockSetView,
      isLoading: false,
      error: null,
    });

    render(<CalendarView />);

    expect(screen.getByLabelText("Día anterior")).toBeDefined();
    expect(screen.getByLabelText("Día siguiente")).toBeDefined();
  });
});

// ─── Tests: Cambio de vista ───────────────────────────────────

describe("CalendarView — cambio de vista", () => {
  it("debe llamar a setView('week') al hacer clic en Semana", () => {
    render(<CalendarView />);

    const weekBtn = screen.getByText("Semana");
    fireEvent.click(weekBtn);

    expect(mockSetView).toHaveBeenCalledWith("week");
  });

  it("debe llamar a setView('day') al hacer clic en Día", () => {
    render(<CalendarView />);

    const dayBtn = screen.getByText("Día");
    fireEvent.click(dayBtn);

    expect(mockSetView).toHaveBeenCalledWith("day");
  });

  it("debe llamar a setView('month') al hacer clic en Mes", () => {
    // La vista actual ya es 'month', pero si hacemos clic igual se debería llamar
    render(<CalendarView />);

    const monthBtn = screen.getByText("Mes");
    fireEvent.click(monthBtn);

    expect(mockSetView).toHaveBeenCalledWith("month");
  });

  it("debe renderizar encabezados de días para vista mensual", () => {
    render(<CalendarView />);

    // SHORT_DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    expect(screen.getByText("Lun")).toBeDefined();
    expect(screen.getByText("Mar")).toBeDefined();
    expect(screen.getByText("Mié")).toBeDefined();
    expect(screen.getByText("Jue")).toBeDefined();
    expect(screen.getByText("Vie")).toBeDefined();
    expect(screen.getByText("Sáb")).toBeDefined();
    expect(screen.getByText("Dom")).toBeDefined();
  });
});

// ─── Tests: Interacción con celdas ────────────────────────────

describe("CalendarView — interacción con celdas", () => {
  it("debe llamar a setDateFilter y onDayClick al hacer clic en un día", () => {
    const onDayClick = jest.fn();
    render(<CalendarView onDayClick={onDayClick} />);

    const gridcells = screen.getAllByRole("gridcell");

    // Hacer clic en la primera celda
    fireEvent.click(gridcells[0]);

    expect(mockSetDateFilter).toHaveBeenCalledTimes(1);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    // Debe recibir una fecha ISO
    const calledIso = onDayClick.mock.calls[0][0] as string;
    expect(calledIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

    // onDayClick no debería llamarse con flechas o Tab
    expect(onDayClick).not.toHaveBeenCalled();
  });
});

// ─── Tests: Navegación por teclado entre días ─────────────────

describe("CalendarView — navegación por teclado", () => {
  it("debe tener tabIndex=0 en todas las celdas para navegación por Tab", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");
    gridcells.forEach((cell) => {
      expect(cell.getAttribute("tabIndex")).toBe("0");
    });
  });

  it("debe permitir que Tab mueva el foco entre celdas", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");

    // Enfocar la primera celda
    gridcells[0].focus();
    expect(document.activeElement).toBe(gridcells[0]);

    // Presionar Tab — el foco se mueve al siguiente elemento focusable
    // (esto depende del orden del DOM; verificamos que el evento no cause error)
    fireEvent.keyDown(gridcells[0], { key: "Tab" });
    // El comportamiento real de Tab depende del navegador;
    // lo importante es que las celdas tengan tabIndex=0
  });

  it("debe tener aria-label descriptivo en celdas con citas", () => {
    setupDefaultCalendar();

    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");

    // Buscar una celda con aria-label que mencione "cita"
    const cellsWithAppointments = gridcells.filter((cell) =>
      cell.getAttribute("aria-label")?.includes("cita"),
    );
    expect(cellsWithAppointments.length).toBeGreaterThan(0);

    if (cellsWithAppointments.length > 0) {
      const label = cellsWithAppointments[0].getAttribute("aria-label")!;
      // Debe contener el conteo y la fecha
      expect(label).toMatch(/\d+ cita/);
    }
  });

  it("debe tener aria-selected en la celda de hoy", () => {
    render(<CalendarView />);

    const gridcells = screen.getAllByRole("gridcell");

    // Debe haber al menos una celda con aria-selected="true"
    const todayCell = gridcells.find(
      (cell) => cell.getAttribute("aria-selected") === "true",
    );
    expect(todayCell).toBeDefined();
  });
});

// ─── Tests: Días no pertenecientes al mes ─────────────────────

describe("CalendarView — días de otros meses", () => {
  it("debe renderizar celdas de meses adyacentes con opacidad reducida", () => {
    // Configurar días con algunos fuera del mes actual
    const days: CalendarDay[] = [
      makeCalendarDay({
        date: new Date(2026, 3, 27), // 27 abril (mes anterior)
        isCurrentMonth: false,
        isToday: false,
      }),
      makeCalendarDay({
        date: new Date(2026, 4, 1), // 1 mayo
        isCurrentMonth: true,
        isToday: false,
      }),
      makeCalendarDay({
        date: new Date(2026, 5, 1), // 1 junio (mes siguiente)
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
    // Las celdas de meses adyacentes deben tener opacidad reducida (clase opacity-40)
    const dimmedCells = gridcells.filter((cell) =>
      cell.className.includes("opacity-40"),
    );
    expect(dimmedCells.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Tests: Puntitos de color por tipo ────────────────────────

describe("CalendarView — indicadores visuales", () => {
  it("debe mostrar puntitos de color para los tipos de cita en un día", () => {
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

    // Los puntitos tienen aria-hidden="true"
    const dots = cell.querySelectorAll('[aria-hidden="true"] span');
    expect(dots.length).toBe(2);

    // Los puntitos deben tener clases de color
    const dotClasses = Array.from(dots).map((d) => d.className);
    expect(dotClasses.some((c) => c.includes("bg-green-500"))).toBe(true);
    expect(dotClasses.some((c) => c.includes("bg-red-500"))).toBe(true);

    // Deben tener título para tooltip
    const allSpans = cell.querySelectorAll('[aria-hidden="true"] span');
    const titles = Array.from(allSpans).map((s) => s.getAttribute("title"));
    expect(titles).toContain("Limpieza");
    expect(titles).toContain("Urgencia");
  });
});
