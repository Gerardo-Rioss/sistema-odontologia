"use client";

import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface StatsCardProps {
  /** Ícono representativo de la métrica (SVG inline). */
  icon: ReactNode;
  /** Etiqueta descriptiva (ej: "Citas hoy"). */
  label: string;
  /** Valor principal de la métrica. */
  value: string | number;
  /** Color de acento del borde izquierdo y del ícono. */
  accent?: "blue" | "green" | "yellow" | "red" | "purple";
  /** Tendencia opcional: valor y dirección. */
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  /** Estado de carga. */
  loading?: boolean;
  /** Mensaje de error. */
  error?: string;
  className?: string;
}

const accentStyles: Record<NonNullable<StatsCardProps["accent"]>, { border: string; icon: string; bg: string }> = {
  blue: {
    border: "border-l-blue-500",
    icon: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
    bg: "bg-blue-50/50 dark:bg-blue-950/50",
  },
  green: {
    border: "border-l-green-500",
    icon: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
    bg: "bg-green-50/50 dark:bg-green-950/50",
  },
  yellow: {
    border: "border-l-yellow-500",
    icon: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
    bg: "bg-yellow-50/50 dark:bg-yellow-950/50",
  },
  red: {
    border: "border-l-red-500",
    icon: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    bg: "bg-red-50/50 dark:bg-red-950/50",
  },
  purple: {
    border: "border-l-purple-500",
    icon: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
    bg: "bg-purple-50/50 dark:bg-purple-950/50",
  },
};

/**
 * Tarjeta de métrica para el dashboard.
 *
 * Muestra un ícono, valor principal, etiqueta y una flecha de tendencia opcional.
 * Soporta estados de carga (spinner) y error.
 *
 * Envuelta con React.memo — solo se re-renderiza si cambian las props.
 */
export const StatsCard = React.memo(function StatsCard({
  icon,
  label,
  value,
  accent = "blue",
  trend,
  loading = false,
  error,
  className,
}: StatsCardProps) {
  const styles = accentStyles[accent];

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950",
          className
        )}
        role="alert"
      >
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900",
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Ícono */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            styles.icon
          )}
        >
          {icon}
        </div>

        {/* Valor */}
        <div className="text-right">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>

      {/* Tendencia */}
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          {trend.direction === "up" ? (
              <svg
                className="h-4 w-4 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          ) : (
              <svg
                className="h-4 w-4 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
              />
            </svg>
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend.direction === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-gray-500">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
});
