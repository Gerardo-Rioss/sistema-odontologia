import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  /** Título opcional, se muestra con jerarquía visual */
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Placeholder para listas o secciones vacías.
 * Muestra un ícono en un círculo, título, mensaje y acción opcional.
 * Usa role="status" para lectores de pantalla.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambian las props.
 */
export const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in",
        className
      )}
    >
      {icon && (
        <div className="mb-6 rounded-full bg-muted p-4 text-muted-foreground">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
});
