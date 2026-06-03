"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { STATUS_LABELS } from "@/lib/constants";
import type { AppointmentStatus } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterBarProps {
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

/**
 * Barra de filtros horizontal con debounce de 300ms.
 * Usa shadcn Select + Input para consistencia visual.
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

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

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
      className={`flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm ${className ?? ""}`}
    >
      {showStatusFilter && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-xs font-medium text-muted-foreground"
          >
            Estado
          </label>
          <Select
            value={statusFilter ?? "ALL"}
            onValueChange={(val) =>
              setStatusFilter(val === "ALL" ? null : (val as AppointmentStatus))
            }
          >
            <SelectTrigger id="filter-status" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "Todos" : STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDateFilter && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-date"
            className="text-xs font-medium text-muted-foreground"
          >
            Fecha
          </label>
          <Input
            id="filter-date"
            type="date"
            value={dateFilter ?? ""}
            onChange={(e) => setDateFilter(e.target.value || null)}
            className="w-[160px]"
          />
        </div>
      )}

      {showSearch && (
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          <label htmlFor="filter-search" className="sr-only">
            Buscar
          </label>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="filter-search"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="mr-1 h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
