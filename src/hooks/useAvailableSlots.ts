'use client';

import { useQuery } from '@tanstack/react-query';
import type { AvailableSlot, ApiResponse } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchAvailableSlots(date: string): Promise<AvailableSlot[]> {
  const res = await fetch(
    `/api/appointments/available-slots?date=${encodeURIComponent(date)}`,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar los horarios disponibles');
  }

  const json: ApiResponse<AvailableSlot[]> = await res.json();
  return json.data ?? [];
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query hook para obtener los slots disponibles en una fecha dada.
 *
 * La consulta se dispara solo cuando `date` es no-nulo.
 * staleTime: 60s — la disponibilidad de slots se considera fresca por 1 minuto.
 */
export function useAvailableSlots(date: string | null) {
  return useQuery({
    queryKey: ['slots', date],
    queryFn: () => fetchAvailableSlots(date!),
    enabled: !!date,
    staleTime: 60_000,
  });
}
