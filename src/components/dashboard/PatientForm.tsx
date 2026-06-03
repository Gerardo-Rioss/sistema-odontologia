"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
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
      <Button variant="default" size="sm" onClick={handleSubmit(onSubmit)} disabled={isPending}>
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
        <InputField
          label="Nombre completo"
          placeholder="Nombre del paciente"
          {...register("name")}
          error={errors.name?.message}
          disabled={isPending}
          required
        />

        {/* Teléfono */}
        <InputField
          label="Teléfono"
          type="tel"
          placeholder="+56 9 1234 5678"
          {...register("phone")}
          error={errors.phone?.message}
          disabled={isPending}
          required
        />

        {/* Email */}
        <InputField
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
            className="mb-1.5 block text-sm font-medium text-foreground"
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
              "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
              errors.notes && "border-destructive focus-visible:ring-destructive/20"
            )}
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.notes.message}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
