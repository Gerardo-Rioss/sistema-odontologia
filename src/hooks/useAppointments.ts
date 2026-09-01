'use client';

import { useQuery } from '@tanstack/react-query';
import type { AppointmentListItem, AppointmentStatus, ApiResponse } from '@/types';
import { useStore } from '@/store/useStore';

// ─── Types ────────────────────────────────────────────────────

export interface AppointmentFilters {
  status?: AppointmentStatus;
  date?: string;
  search?: string;
}

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchAppointments(
  filters?: AppointmentFilters,
): Promise<AppointmentListItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.search) params.set('search', filters.search);

  const res = await fetch(`/api/appointments?${params.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar las citas');
  }

  const json: ApiResponse<AppointmentListItem[]> = await res.json();
  return json.data ?? [];
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query hook para listar citas odontológicas con filtros opcionales.
 *
 * Si no se pasan filtros explícitos, se usan los filtros activos del store
 * de Zustand (statusFilter + dateFilter + searchQuery).
 *
 * staleTime: 30s — los datos se consideran frescos durante 30 segundos.
 */
export function useAppointments(filters?: AppointmentFilters) {
  const zustandFilters = useStore((s) => ({
    status: s.statusFilter,
    date: s.dateFilter,
    search: s.searchQuery,
  }));

  const effectiveFilters: AppointmentFilters | undefined =
    filters ?? {
      status: zustandFilters.status ?? undefined,
      date: zustandFilters.date ?? undefined,
      search: zustandFilters.search ?? undefined,
    };

  return useQuery({
    queryKey: ['appointments', effectiveFilters],
    queryFn: () => fetchAppointments(effectiveFilters),
    staleTime: 30_000,
  });
}
