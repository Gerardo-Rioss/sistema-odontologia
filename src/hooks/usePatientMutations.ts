'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Patient, ApiResponse } from '@/types';
import type { CreatePatientDTO, UpdatePatientDTO } from '@/lib/validations';

async function extractError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || 'Error en la operación');
}

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

export function usePatientMutations() {
  const queryClient = useQueryClient();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    if (id) queryClient.invalidateQueries({ queryKey: ['patients', id] });
  };

  const create = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      invalidate();
      toast.success('Paciente creado exitosamente');
    },
    onError: (err) => toast.error(`Error al crear paciente: ${err.message}`),
  });

  const update = useMutation({
    mutationFn: updatePatient,
    onSuccess: (_data, variables) => {
      invalidate(variables.id);
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (err) => toast.error(`Error al actualizar paciente: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: deletePatient,
    onSuccess: (_data, id) => {
      invalidate(id);
      toast.success('Paciente eliminado');
    },
    onError: (err) => toast.error(`Error al eliminar paciente: ${err.message}`),
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
