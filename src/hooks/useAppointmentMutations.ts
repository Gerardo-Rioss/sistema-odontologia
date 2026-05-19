'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, Appointment } from '@/types';
import type { CreateAppointmentDTO, UpdateAppointmentDTO } from '@/lib/validations';

// ─── Helpers ──────────────────────────────────────────────────

async function extractError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || 'Error en la operación');
}

// ─── API Calls ────────────────────────────────────────────────

async function createAppointment(
  data: CreateAppointmentDTO,
): Promise<Appointment> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Appointment> = await res.json();
  return json.data!;
}

async function updateAppointment(
  args: { id: string; data: UpdateAppointmentDTO },
): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${args.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data),
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Appointment> = await res.json();
  return json.data!;
}

async function deleteAppointment(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
  if (!res.ok) await extractError(res);
}

async function confirmAppointment(id: string): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}/confirm`, {
    method: 'PATCH',
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Appointment> = await res.json();
  return json.data!;
}

async function cancelAppointment(id: string): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}/cancel`, {
    method: 'PATCH',
  });
  if (!res.ok) await extractError(res);
  const json: ApiResponse<Appointment> = await res.json();
  return json.data!;
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * React Query mutations para operaciones CRUD + confirm/cancel de citas.
 *
 * Todas las mutaciones invalidan el queryKey `['appointments']` en onSuccess
 * para que las listas y el calendario se refresquen automáticamente.
 */
export function useAppointmentMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const create = useMutation({
    mutationFn: createAppointment,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: updateAppointment,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: invalidate,
  });

  const confirm = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: invalidate,
  });

  return {
    createAppointment: create.mutateAsync,
    updateAppointment: update.mutateAsync,
    deleteAppointment: remove.mutateAsync,
    confirmAppointment: confirm.mutateAsync,
    cancelAppointment: cancel.mutateAsync,
    isPending:
      create.isPending ||
      update.isPending ||
      remove.isPending ||
      confirm.isPending ||
      cancel.isPending,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    isConfirming: confirm.isPending,
    isCancelling: cancel.isPending,
    error:
      create.error?.message ??
      update.error?.message ??
      remove.error?.message ??
      confirm.error?.message ??
      cancel.error?.message ??
      null,
  };
}
