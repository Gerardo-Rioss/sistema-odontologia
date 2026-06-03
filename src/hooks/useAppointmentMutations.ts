'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiResponse, Appointment } from '@/types';
import type { CreateAppointmentDTO, UpdateAppointmentDTO } from '@/lib/validations';

async function extractError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || 'Error en la operación');
}

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

export function useAppointmentMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const create = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      invalidate();
      toast.success('Cita creada exitosamente');
    },
    onError: (err) => toast.error(`Error al crear cita: ${err.message}`),
  });

  const update = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      invalidate();
      toast.success('Cita actualizada exitosamente');
    },
    onError: (err) => toast.error(`Error al actualizar cita: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      invalidate();
      toast.success('Cita eliminada');
    },
    onError: (err) => toast.error(`Error al eliminar cita: ${err.message}`),
  });

  const confirm = useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => {
      invalidate();
      toast.success('Cita confirmada');
    },
    onError: (err) => toast.error(`Error al confirmar cita: ${err.message}`),
  });

  const cancel = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      invalidate();
      toast.success('Cita cancelada');
    },
    onError: (err) => toast.error(`Error al cancelar cita: ${err.message}`),
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
