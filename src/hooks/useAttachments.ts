'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Attachment, ApiResponse } from '@/types';

// ─── Fetcher ──────────────────────────────────────────────────

async function fetchAttachments(patientId: string): Promise<Attachment[]> {
  const res = await fetch(`/api/patients/${patientId}/attachments`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al cargar archivos');
  }

  const json: ApiResponse<Attachment[]> = await res.json();
  return json.data ?? [];
}

async function uploadAttachmentData(args: {
  patientId: string;
  formData: FormData;
}): Promise<Attachment> {
  const res = await fetch(`/api/patients/${args.patientId}/attachments`, {
    method: 'POST',
    body: args.formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al subir archivo');
  }

  const json: ApiResponse<Attachment> = await res.json();
  return json.data!;
}

async function deleteAttachmentData(args: {
  patientId: string;
  attachmentId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/patients/${args.patientId}/attachments/${args.attachmentId}`,
    { method: 'DELETE' },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al eliminar archivo');
  }
}

// ─── Hooks ────────────────────────────────────────────────────

/**
 * React Query hook para obtener los archivos adjuntos de un paciente.
 *
 * Solo se ejecuta cuando `patientId` es no-nulo (enabled: !!patientId).
 */
export function useAttachments(patientId: string) {
  return useQuery<Attachment[]>({
    queryKey: ['attachments', patientId],
    queryFn: () => fetchAttachments(patientId),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

/**
 * Mutaciones para archivos adjuntos de un paciente.
 *
 * - `uploadAttachment`: Sube un nuevo archivo (FormData).
 * - `deleteAttachment`: Elimina un archivo por ID.
 *   Ambas invalidan la query `['attachments', patientId]` tras éxito.
 */
export function useAttachmentMutations(patientId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['attachments', patientId] });
  };

  const uploadAttachment = useMutation({
    mutationFn: (formData: FormData) =>
      uploadAttachmentData({ patientId, formData }),
    onSuccess: () => {
      invalidate();
      toast.success('Archivo subido exitosamente');
    },
    onError: (err: Error) =>
      toast.error(`Error al subir archivo: ${err.message}`),
  });

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteAttachmentData({ patientId, attachmentId }),
    onSuccess: () => {
      invalidate();
      toast.success('Archivo eliminado');
    },
    onError: (err: Error) =>
      toast.error(`Error al eliminar archivo: ${err.message}`),
  });

  return { uploadAttachment, deleteAttachment };
}
