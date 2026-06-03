"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Estado de apertura del diálogo. */
  open: boolean;
  /** Callback al confirmar la acción. */
  onConfirm: () => void;
  /** Callback al cancelar / cerrar. */
  onCancel: () => void;
  /** Título del diálogo. Por defecto: "¿Estás seguro?" */
  title?: string;
  /** Descripción de la acción a confirmar. */
  message: string;
  /** Texto del botón de confirmación. Por defecto: "Confirmar" */
  confirmLabel?: string;
  /** Texto del botón de cancelación. Por defecto: "Cancelar" */
  cancelLabel?: string;
  /** Variante del botón de confirmación: danger (rojo) o primary (azul). */
  variant?: "danger" | "primary";
  /** Indica si la operación está en curso (deshabilita botones). */
  loading?: boolean;
}

// Map legacy variants to shadcn variants
const variantMap: Record<"danger" | "primary", "destructive" | "default"> = {
  danger: "destructive",
  primary: "default",
};

/**
 * Diálogo de confirmación reutilizable.
 *
 * Envuelve el componente Modal con un mensaje de confirmación
 * y botones Confirmar / Cancelar. Soporta estado de carga.
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = "¿Estás seguro?",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const footer = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelLabel}
      </Button>
      <Button
        variant={variantMap[variant]}
        size="sm"
        onClick={onConfirm}
        disabled={loading}
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={footer}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}
