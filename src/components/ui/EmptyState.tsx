import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Placeholder para listas o secciones vacías.
 * Muestra un ícono centrado, un mensaje y una acción opcional (ej. botón CTA).
 * Usa role="status" para lectores de pantalla.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambian las props.
 */
export const EmptyState = React.memo(function EmptyState({
  icon,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <p className="text-sm text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
});
