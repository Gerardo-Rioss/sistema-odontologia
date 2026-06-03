"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { usePatients } from "@/hooks/usePatients";
import { usePatientMutations } from "@/hooks/usePatientMutations";
import { useAppointments } from "@/hooks/useAppointments";
import { PatientForm } from "@/components/dashboard/PatientForm";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/input";
import { Search, X, UserPlus, Pencil, Trash2, UserRound } from "lucide-react";
import { formatShortDate, formatTime, formatPhoneNumber } from "@/lib/formatters";
import type { Patient } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Página de gestión de pacientes.
 *
 * Funcionalidades:
 * - Búsqueda con debounce (300ms) vía usePatients.
 * - Tabla de pacientes con columnas: nombre, teléfono, email, citas.
 * - Modal de creación/edición de paciente (PatientForm).
 * - Diálogo de confirmación para eliminación (ConfirmDialog).
 * - Expansión inline al hacer clic: muestra últimas citas del paciente.
 * - Estados de carga, vacío y error.
 */
export default function PatientsPage() {
  // ── Zustand: filtro de búsqueda ──
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const resetFilters = useStore((s) => s.resetFilters);

  // ── Estado local del input de búsqueda (debounce) ──
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // ── Datos ──
  const {
    data: patients = [],
    isLoading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
  } = usePatients(searchQuery || undefined);

  const { data: allAppointments = [] } = useAppointments();

  const { deletePatient, isDeleting } = usePatientMutations();

  // ── Estado local: modales y expansión ──
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Handlers ──

  const handleNewPatient = useCallback(() => {
    setEditingPatient(null);
    setFormOpen(true);
  }, []);

  const handleEditPatient = useCallback((patient: Patient) => {
    setEditingPatient(patient);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setEditingPatient(null);
    setFormOpen(false);
    refetchPatients();
  }, [refetchPatients]);

  const handleDeleteRequest = useCallback((patient: Patient) => {
    setDeleteTarget(patient);
    setConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) {
      await deletePatient(deleteTarget.id);
      setConfirmOpen(false);
      setDeleteTarget(null);
      refetchPatients();
    }
  }, [deleteTarget, deletePatient, refetchPatients]);

  const handleDeleteCancel = useCallback(() => {
    setConfirmOpen(false);
    setDeleteTarget(null);
  }, []);

  const handleRowClick = useCallback((patient: Patient) => {
    setExpandedId((prev) => (prev === patient.id ? null : patient.id));
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    resetFilters();
  }, [resetFilters]);

  // ── Citas del paciente expandido ──
  const expandedAppointments = useMemo(() => {
    if (!expandedId) return [];
    return allAppointments
      .filter((a) => a.patientId === expandedId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expandedId, allAppointments]);

  // ── Columnas de la tabla ──

  const columns = [
    {
      key: "name",
      header: "Nombre",
      sortable: true,
      render: (row: Patient) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "phone",
      header: "Teléfono",
      sortable: true,
      render: (row: Patient) => (
        <span className="text-muted-foreground">{formatPhoneNumber(row.phone)}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (row: Patient) => (
        <span className="text-muted-foreground">{row.email ?? "—"}</span>
      ),
    },
    {
      key: "appointments",
      header: "Citas",
      sortable: true,
      render: (row: Patient) => (
        <span className="text-muted-foreground">
          {row._count?.appointments ?? allAppointments.filter((a) => a.patientId === row.id).length}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      className: "w-24",
      render: (row: Patient) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditPatient(row);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Editar ${row.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRequest(row);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Empty state ──

  const emptyState = (
    <EmptyState
      icon={<UserRound className="h-12 w-12" />}
      message="No hay pacientes registrados"
      action={
        searchQuery ? (
          <Button variant="ghost" size="sm" onClick={handleClearSearch}>
            Limpiar búsqueda
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={handleNewPatient}>
            Agregar primer paciente
          </Button>
        )
      }
    />
  );

  // ── Delete confirmation message ──
  const deleteMessage = deleteTarget
    ? `¿Eliminar a ${deleteTarget.name}? Se eliminarán también todas sus citas asociadas. Esta acción no se puede deshacer.`
    : "";

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button onClick={handleNewPatient}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar paciente por nombre..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-10"
            aria-label="Buscar paciente"
          />
          {localSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Estado de error */}
      {patientsError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center shadow-sm" role="alert">
          <p className="text-sm font-medium text-destructive">Error al cargar pacientes</p>
          <p className="mt-1 text-sm text-destructive">{patientsError.message}</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => refetchPatients()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Estado de carga */}
      {patientsLoading && !patientsError && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Tabla de pacientes */}
      {!patientsLoading && !patientsError && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table
            columns={columns}
            data={patients}
            isLoading={false}
            emptyState={emptyState}
            onRowClick={handleRowClick}
          />

          {/* Expansión inline: últimas citas del paciente */}
          {expandedId && expandedAppointments.length > 0 && (
            <div className="border-t bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Últimas citas
              </h3>
              <div className="space-y-2">
                {expandedAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg bg-card px-4 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {formatShortDate(apt.date)}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatTime(apt.time)}</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          apt.status === "PENDING" && "bg-yellow-100 text-yellow-800",
                          apt.status === "CONFIRMED" && "bg-green-100 text-green-800",
                          apt.status === "CANCELLED" && "bg-red-100 text-red-800",
                          apt.status === "COMPLETED" && "bg-blue-100 text-blue-800",
                        )}
                      >
                        {apt.status === "PENDING" && "Pendiente"}
                        {apt.status === "CONFIRMED" && "Confirmada"}
                        {apt.status === "CANCELLED" && "Cancelada"}
                        {apt.status === "COMPLETED" && "Completada"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedId && expandedAppointments.length === 0 && (
            <div className="border-t bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">No hay citas registradas para este paciente.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modales ── */}

      {/* Modal de creación/edición de paciente */}
      <PatientForm
        open={formOpen}
        onClose={handleFormClose}
        patient={editingPatient}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        message={deleteMessage}
        confirmLabel="Eliminar paciente"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
