'use client';

import { useQuery } from '@tanstack/react-query';
import type { Patient, ApiResponse } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchPatient(
  id: string,
): Promise<Patient & { appointments: NonNullable<Patient['appointments']> }> {
  const res = await fetch(`/api/patients/${id}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar el paciente');
  }

  const json: ApiResponse<
    Patient & { appointments: NonNullable<Patient['appointments']> }
  > = await res.json();
  return json.data!;
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query hook para obtener un paciente individual con su historial de citas.
 *
 * Solo ejecuta la query cuando `id` es no-nulo (enabled: !!id).
 * Útil para páginas de detalle y modales de edición.
 */
export function usePatient(id: string | null) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
