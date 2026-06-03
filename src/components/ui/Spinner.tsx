"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const;

/**
 * Indicador de carga animado. Usa animate-spin de Tailwind
 * y un texto sr-only para lectores de pantalla.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambian size o className.
 */
export const Spinner = React.memo(function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn("inline-block", className)}
    >
      <svg
        className={cn("animate-spin text-primary", sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">Cargando...</span>
    </div>
  );
});
