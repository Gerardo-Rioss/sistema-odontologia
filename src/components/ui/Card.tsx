import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Contenedor tipo tarjeta con sombra sutil, bordes redondeados,
 * y slots opcionales de cabecera y pie.
 */
export function Card({ children, className, header, footer }: CardProps) {
  return (
    <div className={cn("rounded-xl bg-white shadow-sm dark:bg-gray-900", className)}>
      {header && (
        <div className="border-b border-gray-200 px-6 py-4 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
          {header}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">{footer}</div>}
    </div>
  );
}
