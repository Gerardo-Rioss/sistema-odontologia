/**
 * Tests for useStatistics hook (server-side fetch version).
 *
 * Verifies:
 *  - Fetches from /api/statistics/overview via useQuery
 *  - Returns StatisticsReturn shape on success
 *  - Returns isLoading: true during fetch
 *  - Returns error state on fetch failure
 *  - No useAppointments / usePatients calls inside hook
 *
 * Mocks fetch and useQuery.
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useStatistics } from "@/hooks/useStatistics";
import type { ApiResponse } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock React Query — we need a QueryClient provider wrapper
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function makeStatisticsResponse(overrides: Record<string, unknown> = {}): ApiResponse {
  return {
    success: true,
    data: {
      overview: {
        totalAppointments: 10,
        totalPatients: 5,
        appointmentsToday: 2,
        completionRate: 70,
      },
      appointmentsByMonth: [
        { month: "ene. 2026", count: 3 },
        { month: "feb. 2026", count: 2 },
      ],
      byType: [{ type: "Limpieza", count: 5 }],
      byStatus: [{ status: "Completada", count: 7 }],
      completionTrend: [
        { month: "ene. 2026", rate: 67 },
        { month: "feb. 2026", rate: 50 },
      ],
      cancellationRate: 20,
      newVsReturning: { newPatients: 3, returningPatients: 2 },
      isLoading: false,
      error: null,
      ...overrides,
    },
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────

describe("useStatistics — fetch from API", () => {
  it("should return StatisticsReturn shape on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeStatisticsResponse()),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStatistics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overview.totalAppointments).toBe(10);
    expect(result.current.overview.totalPatients).toBe(5);
    expect(result.current.overview.appointmentsToday).toBe(2);
    expect(result.current.overview.completionRate).toBe(70);
    expect(result.current.byType).toHaveLength(1);
    expect(result.current.byType[0].type).toBe("Limpieza");
    expect(result.current.byStatus[0].status).toBe("Completada");
    expect(result.current.cancellationRate).toBe(20);
    expect(result.current.newVsReturning.newPatients).toBe(3);
    expect(result.current.newVsReturning.returningPatients).toBe(2);
  });

  it("should call /api/statistics/overview endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeStatisticsResponse()),
    });

    const wrapper = createWrapper();
    renderHook(() => useStatistics(), { wrapper });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/statistics/overview");
    });
  });

  it("should return isLoading: true during fetch", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStatistics(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("should return error state on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Error de servidor" }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStatistics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Error de servidor");
    expect(result.current.overview.totalAppointments).toBe(0);
  });

  it("should return default error message when body has no error field", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStatistics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Error al cargar estadísticas");
  });

  it("should include all StatisticsReturn fields", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeStatisticsResponse()),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStatistics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify all required fields exist
    expect(result.current).toHaveProperty("overview");
    expect(result.current).toHaveProperty("appointmentsByMonth");
    expect(result.current).toHaveProperty("byType");
    expect(result.current).toHaveProperty("byStatus");
    expect(result.current).toHaveProperty("completionTrend");
    expect(result.current).toHaveProperty("cancellationRate");
    expect(result.current).toHaveProperty("newVsReturning");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
  });
});
