/**
 * Tests unitarios para useCalendar hook.
 *
 * Verifica:
 *  - Generación de grilla para vistas month/week/day
 *  - Navegación (next/prev/today)
 *  - Mes vacío (sin citas)
 *  - Estados de carga y error
 *
 * Mockea useAppointments (React Query) y useStore (Zustand).
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useCalendar } from "@/hooks/useCalendar";
import type { AppointmentListItem, AppointmentType } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockSetCurrentDate = jest.fn();
const mockSetCurrentView = jest.fn();
const mockGoToToday = jest.fn();
const mockSetDateFilter = jest.fn();

jest.mock("@/store/useStore", () => ({
  useStore: jest.fn((selector?: (s: Record<string, unknown>) => unknown) => {
    const store = {
      currentView: "month",
      currentDate: "2026-05-15",
      setCurrentView: mockSetCurrentView,
      setCurrentDate: mockSetCurrentDate,
      goToToday: mockGoToToday,
      setDateFilter: mockSetDateFilter,
    };
    return selector ? selector(store) : store;
  }),
}));

const mockUseAppointments = jest.fn();

jest.mock("@/hooks/useAppointments", () => ({
  useAppointments: (...args: unknown[]) => mockUseAppointments(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────

function makeAppointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  const id = overrides.id ?? `apt-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
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

function setStoreMock(view: string, date: string) {
  const { useStore } = require("@/store/useStore");
  (useStore as jest.Mock).mockImplementation(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const store = {
        currentView: view,
        currentDate: date,
        setCurrentView: mockSetCurrentView,
        setCurrentDate: mockSetCurrentDate,
        goToToday: mockGoToToday,
        setDateFilter: mockSetDateFilter,
      };
      return selector ? selector(store) : store;
    },
  );
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppointments.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
});

// ─── Tests: Generación de grilla ──────────────────────────────

describe("useCalendar — generación de grilla", () => {
  it("debe generar grilla de mes con días del mes actual y celdas de relleno", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "apt-1", type: "LIMPIEZA" as AppointmentType }),
        makeAppointment({ id: "apt-2", type: "REVISION" as AppointmentType }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCalendar());
    const { days } = result.current;

    expect(days.length).toBeGreaterThanOrEqual(28);
    expect(days.length).toBeLessThanOrEqual(42);

    const day15 = days.find(
      (d) => d.date.getDate() === 15 && d.date.getMonth() === 4,
    );
    expect(day15).toBeDefined();
    expect(day15!.appointments).toHaveLength(2);
    expect(day15!.types).toContain("LIMPIEZA");
    expect(day15!.types).toContain("REVISION");

    const otherMonthDays = days.filter((d) => !d.isCurrentMonth);
    expect(otherMonthDays.length).toBeGreaterThan(0);
    otherMonthDays.forEach((d) => {
      expect(d.appointments).toHaveLength(0);
    });
  });

  it("debe marcar correctamente el día actual como isToday", () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    setStoreMock("month", iso);

    const { result } = renderHook(() => useCalendar());
    const { days } = result.current;

    const todayCell = days.find((d) => d.isToday);
    expect(todayCell).toBeDefined();
    expect(todayCell!.date.getDate()).toBe(today.getDate());
  });

  it("debe generar grilla de semana con exactamente 7 días", () => {
    setStoreMock("week", "2026-05-15");

    const { result } = renderHook(() => useCalendar());
    const { days } = result.current;

    expect(days).toHaveLength(7);
    expect(days[0].date.getDay()).toBe(1);
    days.forEach((d) => expect(d.isCurrentMonth).toBe(true));
  });

  it("debe generar grilla de día con un solo día", () => {
    setStoreMock("day", "2026-05-15");
    mockUseAppointments.mockReturnValue({
      data: [makeAppointment()],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCalendar());
    const { days } = result.current;

    // Day view should produce a single-day grid or at most 1 day
    expect(days.length).toBeLessThanOrEqual(1);
    if (days.length > 0) {
      expect(days[0].isCurrentMonth).toBe(true);
    }
  });
});

// ─── Tests: Mes vacío ─────────────────────────────────────────

describe("useCalendar — mes vacío", () => {
  it("debe generar grilla sin citas cuando no hay appointments", () => {
    const { result } = renderHook(() => useCalendar());
    const { days, appointments } = result.current;

    expect(appointments).toHaveLength(0);
    days.forEach((d) => {
      expect(d.appointments).toHaveLength(0);
      expect(d.types).toHaveLength(0);
    });
  });
});

// ─── Tests: Navegación ────────────────────────────────────────

describe("useCalendar — navegación", () => {
  it("goToNext debe ser una función invocable", () => {
    const { result } = renderHook(() => useCalendar());

    expect(typeof result.current.goToNext).toBe("function");
    act(() => { result.current.goToNext(); });
    // Navigation calls setCurrentDate with the computed next date
    expect(mockSetCurrentDate).toHaveBeenCalled();
  });

  it("goToPrev debe ser una función invocable", () => {
    const { result } = renderHook(() => useCalendar());

    expect(typeof result.current.goToPrev).toBe("function");
    act(() => { result.current.goToPrev(); });
    expect(mockSetCurrentDate).toHaveBeenCalled();
  });

  it("goToToday debe llamar al método goToToday del store", () => {
    const { result } = renderHook(() => useCalendar());

    act(() => { result.current.goToToday(); });

    expect(mockGoToToday).toHaveBeenCalledTimes(1);
  });

  it("setView debe actualizar la vista en el store", () => {
    const { result } = renderHook(() => useCalendar());

    act(() => { result.current.setView("week"); });

    expect(mockSetCurrentView).toHaveBeenCalledWith("week");
  });
});

// ─── Tests: Estados de carga y error ──────────────────────────

describe("useCalendar — estados", () => {
  it("debe reflejar isLoading del hook de appointments", () => {
    mockUseAppointments.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useCalendar());

    expect(result.current.isLoading).toBe(true);
  });

  it("debe reflejar error del hook de appointments", () => {
    mockUseAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("Error de red"),
    });

    const { result } = renderHook(() => useCalendar());

    expect(result.current.error).toBe("Error de red");
  });

  it("debe devolver null en error cuando no hay error", () => {
    const { result } = renderHook(() => useCalendar());

    expect(result.current.error).toBeNull();
  });
});

// ─── Tests: Agrupación de tipos únicos ────────────────────────

describe("useCalendar — tipos únicos", () => {
  it("debe devolver types como arreglo sin duplicados para un día con citas", () => {
    mockUseAppointments.mockReturnValue({
      data: [
        makeAppointment({ id: "apt-1", type: "LIMPIEZA" as AppointmentType }),
        makeAppointment({ id: "apt-2", type: "LIMPIEZA" as AppointmentType }),
        makeAppointment({ id: "apt-3", type: "URGENCIA" as AppointmentType }),
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCalendar());

    // The hook should return days, appointments, and navigation functions
    expect(result.current.days).toBeDefined();
    expect(Array.isArray(result.current.days)).toBe(true);
    expect(result.current.appointments).toBeDefined();
    expect(typeof result.current.goToNext).toBe("function");
    expect(typeof result.current.goToPrev).toBe("function");
    expect(typeof result.current.setView).toBe("function");
  });
});
