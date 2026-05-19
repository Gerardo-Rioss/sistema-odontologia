'use client';

import { useQuery } from '@tanstack/react-query';
import type { Patient, ApiResponse } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchPatients(search?: string): Promise<Patient[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const res = await fetch(`/api/patients?${params.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar los pacientes');
  }

  const json: ApiResponse<Patient[]> = await res.json();
  return json.data ?? [];
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query hook para listar pacientes con búsqueda por texto.
 *
 * El parámetro `search` se pasa directamente como query param a la API.
 * Para debounce, usar `useDebounce` en el componente consumidor.
 */
export function usePatients(search?: string) {
  return useQuery({
    queryKey: ['patients', search ?? ''],
    queryFn: () => fetchPatients(search || undefined),
    staleTime: 30_000,
  });
}
