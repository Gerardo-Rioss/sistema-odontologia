'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MedicalRecord, ApiResponse } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchMedicalRecord(patientId: string): Promise<MedicalRecord | null> {
  const res = await fetch(`/api/patients/${patientId}/medical-record`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) return null;
    throw new Error(body.error || 'Error al cargar historia clínica');
  }

  const json: ApiResponse<MedicalRecord> = await res.json();
  return json.data ?? null;
}

async function saveMedicalRecordData(args: {
  patientId: string;
  data: Record<string, unknown>;
}): Promise<MedicalRecord> {
  const res = await fetch(`/api/patients/${args.patientId}/medical-record`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al guardar historia clínica');
  }

  const json: ApiResponse<MedicalRecord> = await res.json();
  return json.data!;
}

// ─── Hooks ────────────────────────────────────────────────────

/**
 * React Query hook para obtener la historia clínica de un paciente.
 *
 * Solo se ejecuta cuando `patientId` es no-nulo (enabled: !!patientId).
 * Si la API responde 404 (no existe registro), retorna `null`.
 */
export function useMedicalRecord(patientId: string) {
  return useQuery<MedicalRecord | null>({
    queryKey: ['medical-record', patientId],
    queryFn: () => fetchMedicalRecord(patientId),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

/**
 * Mutaciones para la historia clínica de un paciente.
 *
 * - `saveMedicalRecord`: Crea o actualiza el registro completo.
 *   Invalida la query `['medical-record', patientId]` tras éxito.
 */
export function useMedicalRecordMutations(patientId: string) {
  const queryClient = useQueryClient();

  const saveMedicalRecord = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      saveMedicalRecordData({ patientId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record', patientId] });
      toast.success('Historia clínica guardada exitosamente');
    },
    onError: (err: Error) =>
      toast.error(`Error al guardar historia clínica: ${err.message}`),
  });

  return { saveMedicalRecord };
}
