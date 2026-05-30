"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { STATUS_LABELS } from "@/lib/constants";
import type { AppointmentStatus } from "@/types";

interface FilterBarProps {
  /** Si es true, muestra el filtro de estado de cita. */
  showStatusFilter?: boolean;
  /** Si es true, muestra el filtro de fecha. */
  showDateFilter?: boolean;
  /** Si es true, muestra el campo de búsqueda de texto. */
  showSearch?: boolean;
  /** Placeholder del campo de búsqueda. */
  searchPlaceholder?: string;
  className?: string;
}

/**
 * Barra de filtros horizontal con debounce de 300ms.
 *
 * Actualiza directamente el slice `FilterSlice` del store de Zustand.
 * El componente padre puede elegir qué filtros mostrar según la página.
 */
export function FilterBar({
  showStatusFilter = true,
  showDateFilter = true,
  showSearch = true,
  searchPlaceholder = "Buscar...",
  className,
}: FilterBarProps) {
  const statusFilter = useStore((s) => s.statusFilter);
  const dateFilter = useStore((s) => s.dateFilter);
  const searchQuery = useStore((s) => s.searchQuery);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const setDateFilter = useStore((s) => s.setDateFilter);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const resetFilters = useStore((s) => s.resetFilters);

  // Estado local del input de búsqueda (para debounce)
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sincronizar localSearch con el store cuando cambia externamente
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce: actualiza el store 300ms después del último cambio
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const handleReset = useCallback(() => {
    setLocalSearch("");
    resetFilters();
  }, [resetFilters]);

  const hasActiveFilters =
    statusFilter !== null || dateFilter !== null || searchQuery !== "";

  const statusOptions: (AppointmentStatus | "ALL")[] = [
    "ALL",
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 ${className ?? ""}`}
    >
      {/* Filtro de estado */}
      {showStatusFilter && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            Estado
          </label>
          <select
            id="filter-status"
            value={statusFilter ?? "ALL"}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val === "ALL" ? null : (val as AppointmentStatus));
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Todos" : STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtro de fecha */}
      {showDateFilter && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-date"
            className="text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            Fecha
          </label>
          <input
            id="filter-date"
            type="date"
            value={dateFilter ?? ""}
            onChange={(e) => setDateFilter(e.target.value || null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        </div>
      )}

      {/* Búsqueda de texto */}
      {showSearch && (
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          <label htmlFor="filter-search" className="sr-only">
            Buscar
          </label>
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="filter-search"
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      )}

      {/* Botón de reset */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
