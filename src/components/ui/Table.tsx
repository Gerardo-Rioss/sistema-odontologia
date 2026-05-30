"use client";

import { type ReactNode, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
  className?: string;
}

/**
 * Tabla genérica con:
 * - Encabezados ordenables con aria-sort
 * - Filas esqueleto (skeleton) durante carga
 * - Slot de estado vacío (emptyState)
 * - onClick por fila (opcional)
 */
export function Table<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  onRowClick,
  skeletonRows = 5,
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = col.render(a);
      const bVal = col.render(b);
      // Comparar como strings para tipos primitivos — los render pueden devolver ReactNode
      const aStr = typeof aVal === "string" ? aVal : "";
      const bStr = typeof bVal === "string" ? bVal : "";
      const cmp = aStr.localeCompare(bStr, "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  // Estado de carga: filas esqueleto
  if (isLoading) {
    return (
      <div
        className={cn("overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-gray-900", className)}
      >
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Estado vacío
  if (data.length === 0 && emptyState) {
    return (
      <div className={cn("rounded-xl bg-white shadow-sm dark:bg-gray-900", className)}>
        {emptyState}
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-gray-900", className)}
    >
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400",
                  col.sortable && "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200",
                  col.className
                )}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-xs">
                      {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-6 py-4 text-sm text-gray-900 dark:text-gray-100", col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
