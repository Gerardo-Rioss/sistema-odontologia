'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient, ApiResponse } from '@/types';
import type { CreatePatientDTO, UpdatePatientDTO } from '@/lib/validations';

// ─── Helpers ──────────────────────────────────────────────────

async function extractError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || 'Error en la operación');
}

// ─── API Calls ────────────────────────────────────────────────

async function createPatient(data: CreatePatientDTO): Promise<Patient> {
  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Patient> = await res.json();
  return json.data!;
}

async function updatePatient(
  args: { id: string; data: UpdatePatientDTO },
): Promise<Patient> {
  const res = await fetch(`/api/patients/${args.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data),
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Patient> = await res.json();
  return json.data!;
}

async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) await extractError(res);
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query mutations para CRUD de pacientes.
 *
 * En onSuccess se invalidan tanto el queryKey `['patients']` (lista)
 * como el queryKey `['patients', id]` (detalle individual).
 */
export function usePatientMutations() {
  const queryClient = useQueryClient();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    if (id) queryClient.invalidateQueries({ queryKey: ['patients', id] });
  };

  const create = useMutation({
    mutationFn: createPatient,
    onSuccess: (_data) => invalidate(),
  });

  const update = useMutation({
    mutationFn: updatePatient,
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  const remove = useMutation({
    mutationFn: deletePatient,
    onSuccess: (_data, id) => invalidate(id),
  });

  return {
    createPatient: create.mutateAsync,
    updatePatient: update.mutateAsync,
    deletePatient: remove.mutateAsync,
    isPending: create.isPending || update.isPending || remove.isPending,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    error:
      create.error?.message ??
      update.error?.message ??
      remove.error?.message ??
      null,
  };
}
