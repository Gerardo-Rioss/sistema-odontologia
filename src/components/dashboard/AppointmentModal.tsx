"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import {
  CreateAppointmentDTO,
  type CreateAppointmentDTO as CreateDTO,
} from "@/lib/validations";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { usePatients } from "@/hooks/usePatients";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import type { AppointmentType, AppointmentListItem } from "@/types";
import { cn } from "@/lib/utils";

// ─── Tipos del formulario ─────────────────────────────────────

type FormValues = CreateDTO;

// ─── Props ────────────────────────────────────────────────────

interface AppointmentModalProps {
  /** Estado de apertura. */
  open: boolean;
  /** Callback al cerrar. */
  onClose: () => void;
  /** Datos de la cita a editar. Si es null/undefined, modo creación. */
  appointment?: AppointmentListItem | null;
}

const APPOINTMENT_TYPES: AppointmentType[] = [
  "LIMPIEZA",
  "REVISION",
  "URGENCIA",
  "TRATAMIENTO",
  "OTRO",
];

// ─── Componente ──────────────────────────────────────────────

/**
 * Modal para crear o editar una cita odontológica.
 *
 * - Usa react-hook-form con validación Zod (CreateAppointmentDTO).
 * - Selector de paciente con búsqueda (usePatients).
 * - Selector de horario disponible (useAvailableSlots).
 * - En modo edición, precarga los datos de la cita existente.
 * - Al enviar, llama a `createAppointment` o `updateAppointment` de useAppointmentMutations.
 */
export function AppointmentModal({
  open,
  onClose,
  appointment,
}: AppointmentModalProps) {
  const isEdit = !!appointment;
  const { createAppointment, updateAppointment, isCreating, isUpdating } =
    useAppointmentMutations();
  const isPending = isCreating || isUpdating;

  // ── Form ──
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateAppointmentDTO),
    defaultValues: {
      patientId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      type: "REVISION" as AppointmentType,
      notes: "",
    },
  });

  const selectedDate = watch("date");

  // Precargar datos en modo edición
  useEffect(() => {
    if (open) {
      if (appointment) {
        reset({
          patientId: appointment.patientId,
          date: format(new Date(appointment.date), "yyyy-MM-dd"),
          time: appointment.time,
          type: appointment.type,
          notes: appointment.notes ?? "",
        });
      } else {
        reset({
          patientId: "",
          date: format(new Date(), "yyyy-MM-dd"),
          time: "",
          type: "REVISION" as AppointmentType,
          notes: "",
        });
      }
    }
  }, [open, appointment, reset]);

  // ── Búsqueda de pacientes ──
  const [patientSearch, setPatientSearch] = useState("");
  const { data: patients = [], isLoading: patientsLoading } =
    usePatients(patientSearch || undefined);

  // ── Slots disponibles ──
  const { data: slots = [], isLoading: slotsLoading } = useAvailableSlots(
    selectedDate || null,
  );

  // ── Submit ──
  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && appointment) {
        await updateAppointment({
          id: appointment.id,
          data: {
            date: data.date,
            time: data.time,
            type: data.type,
            notes: data.notes || undefined,
          } as import("@/lib/validations").UpdateAppointmentDTO,
        });
      } else {
        await createAppointment(data);
      }
      onClose();
    } catch {
      // Error manejado por el hook de mutación (toast/notificación)
    }
  };

  const footer = (
    <>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
        Cancelar
      </Button>
      <Button variant="default" size="sm" onClick={handleSubmit(onSubmit)} disabled={isPending}>
        {isEdit ? "Guardar cambios" : "Crear cita"}
      </Button>
    </>
  );

  // ── Render ──
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar cita" : "Nueva cita"}
      size="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Paciente */}
        <div>
          <label
            htmlFor="apt-patient-search"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Paciente
          </label>
          <div className="relative">
            <InputField
              id="apt-patient-search"
              type="text"
              placeholder="Buscar paciente..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            />
            {patientsLoading && (
              <div className="absolute right-3 top-2.5">
                <svg className="h-4 w-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Lista de pacientes filtrados */}
          {patientSearch && patients.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border bg-card shadow-sm">
              {patients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setValue("patientId", p.id);
                    setPatientSearch(p.name);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    watch("patientId") === p.id && "bg-accent text-accent-foreground"
                  )}
                >
                  {p.name} — {p.phone}
                </button>
              ))}
            </div>
          )}

          {patientSearch && patients.length === 0 && !patientsLoading && (
            <p className="mt-1 text-xs text-muted-foreground">No se encontraron pacientes</p>
          )}

          <InputField type="hidden" {...register("patientId")} />
          {errors.patientId && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.patientId.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Fecha */}
          <InputField
            label="Fecha"
            type="date"
            {...register("date")}
            error={errors.date?.message}
          />

          {/* Hora */}
          <div>
            <label
              htmlFor="apt-time"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Hora
            </label>
            {slots.length > 0 ? (
              <select
                id="apt-time"
                {...register("time")}
                className={cn(
                  "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                  errors.time && "border-destructive focus-visible:ring-destructive/20"
                )}
              >
                <option value="">Seleccionar horario</option>
                {slots
                  .filter((s) => s.available)
                  .map((s) => (
                    <option key={s.time} value={s.time}>
                      {s.time}
                    </option>
                  ))}
              </select>
            ) : (
              <InputField
                id="apt-time"
                type="time"
                {...register("time")}
                error={errors.time?.message}
                disabled={slotsLoading}
              />
            )}
            {errors.time && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.time.message}
              </p>
            )}
          </div>
        </div>

        {/* Tipo de cita */}
        <div>
          <label
            htmlFor="apt-type"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Tipo de cita
          </label>
          <select
            id="apt-type"
            {...register("type")}
            className={cn(
              "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
              errors.type && "border-destructive focus-visible:ring-destructive/20"
            )}
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.type.message}
            </p>
          )}
        </div>

        {/* Notas */}
        <div>
          <label
            htmlFor="apt-notes"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Notas
          </label>
          <textarea
            id="apt-notes"
            {...register("notes")}
            rows={3}
            placeholder="Notas adicionales (opcional)"
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>
      </form>
    </Modal>
  );
}
