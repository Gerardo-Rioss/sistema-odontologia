"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CreatePatientDTO,
  type CreatePatientDTO as CreateDTO,
} from "@/lib/validations";
import { usePatientMutations } from "@/hooks/usePatientMutations";
import type { Patient } from "@/types";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────

type FormValues = CreateDTO;

interface PatientFormProps {
  /** Estado de apertura del modal. */
  open: boolean;
  /** Callback al cerrar. */
  onClose: () => void;
  /** Datos del paciente a editar. Si es null/undefined, modo creación. */
  patient?: Patient | null;
}

/**
 * Formulario modal para crear o editar un paciente.
 *
 * - Usa react-hook-form con validación Zod (CreatePatientDTO / UpdatePatientDTO).
 * - Campos: nombre, teléfono, email (opcional), notas (opcional).
 * - En modo edición precarga los datos existentes.
 * - Al enviar llama a `createPatient` o `updatePatient` de usePatientMutations.
 */
export function PatientForm({ open, onClose, patient }: PatientFormProps) {
  const isEdit = !!patient;
  const { createPatient, updatePatient, isCreating, isUpdating } =
    usePatientMutations();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreatePatientDTO),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  // Precargar datos en modo edición
  useEffect(() => {
    if (open) {
      if (patient) {
        reset({
          name: patient.name,
          phone: patient.phone,
          email: patient.email ?? "",
          notes: patient.notes ?? "",
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          notes: "",
        });
      }
    }
  }, [open, patient, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && patient) {
        // Para update, filtrar valores vacíos para campos opcionales
        const updateData: import("@/lib/validations").UpdatePatientDTO = {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          notes: data.notes || null,
        };
        await updatePatient({ id: patient.id, data: updateData });
      } else {
        await createPatient(data);
      }
      onClose();
    } catch {
      // Error manejado por el hook de mutación
    }
  };

  const footer = (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
        Cancelar
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit(onSubmit)} loading={isPending}>
        {isEdit ? "Guardar cambios" : "Crear paciente"}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar paciente" : "Nuevo paciente"}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Nombre */}
        <Input
          label="Nombre completo"
          placeholder="Nombre del paciente"
          {...register("name")}
          error={errors.name?.message}
          disabled={isPending}
          required
        />

        {/* Teléfono */}
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+56 9 1234 5678"
          {...register("phone")}
          error={errors.phone?.message}
          disabled={isPending}
          required
        />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="paciente@email.com"
          {...register("email")}
          error={errors.email?.message}
          disabled={isPending}
        />

        {/* Notas */}
        <div>
          <label
            htmlFor="patient-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Notas
          </label>
          <textarea
            id="patient-notes"
            {...register("notes")}
            rows={3}
            placeholder="Notas adicionales (opcional)"
            disabled={isPending}
            className={cn(
              "block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
              errors.notes ? "border-red-300" : "border-gray-300",
              isPending && "bg-gray-50 text-gray-500"
            )}
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.notes.message}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
