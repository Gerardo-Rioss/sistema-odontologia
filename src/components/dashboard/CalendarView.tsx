"use client";

import { useCallback } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCalendar } from "@/hooks/useCalendar";
import { useStore, type CalendarView } from "@/store/useStore";
import {
  SHORT_DAY_NAMES,
  APPOINTMENT_DOT_COLORS,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { AppointmentListItem } from "@/types";

// ─── Tipos locales ────────────────────────────────────────────

interface CalendarViewProps {
  /** Callback al hacer clic en un día del calendario. Recibe la fecha ISO (yyyy-MM-dd). */
  onDayClick?: (dateIso: string) => void;
  className?: string;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Mes",
  week: "Semana",
  day: "Día",
};

// ─── Componente ──────────────────────────────────────────────

/**
 * Calendario con vista de mes, semana o día usando CSS Grid de 7 columnas.
 *
 * - Lee y escribe el estado de vista y fecha en el store de Zustand.
 * - Obtiene los datos del hook `useCalendar()`.
 * - Muestra puntitos de color por tipo de cita en cada celda.
 * - Soporta navegación con flechas y botón "Hoy".
 * - Llama a `onDayClick(dateIso)` al hacer clic en un día.
 */
export function CalendarView({ onDayClick, className }: CalendarViewProps) {
  const { days, viewDate, currentView, goToNext, goToPrev, goToToday, setView, isLoading, error } =
    useCalendar();
  const setDateFilter = useStore((s) => s.setDateFilter);

  const handleDayClick = useCallback(
    (date: Date) => {
      const iso = format(date, "yyyy-MM-dd");
      setDateFilter(iso);
      onDayClick?.(iso);
    },
    [setDateFilter, onDayClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: Date) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDayClick(date);
      }
    },
    [handleDayClick],
  );

  // ── Título del período ──
  const periodTitle = (() => {
    if (currentView === "month") {
      return format(viewDate, "MMMM yyyy", { locale: es });
    }
    if (currentView === "week") {
      return `Semana del ${format(days[0]?.date ?? viewDate, "d 'de' MMMM", { locale: es })}`;
    }
    return format(viewDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
  })();

  // ── Estado de carga / error ──
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl bg-white p-12 shadow-sm dark:bg-gray-900", className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-xl bg-red-50 p-6 text-center shadow-sm dark:bg-red-950", className)} role="alert">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-white shadow-sm dark:bg-gray-900", className)}>
      {/* Cabecera: navegación + vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={`${currentView === "month" ? "Mes" : currentView === "week" ? "Semana" : "Día"} anterior`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h3 className="min-w-[160px] text-center text-base font-semibold text-gray-900">
            {periodTitle}
          </h3>

          <button
            onClick={goToNext}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label={`${currentView === "month" ? "Mes" : currentView === "week" ? "Semana" : "Día"} siguiente`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de vista */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
            {(Object.entries(VIEW_LABELS) as [CalendarView, string][]).map(([view, label]) => (
              <button
                key={view}
                onClick={() => setView(view)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  currentView === view
                    ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Botón Hoy */}
          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Cuerpo del calendario */}
      <div className="p-2">
        {/* Encabezados de días (solo para month/week) */}
        {currentView !== "day" && (
          <div className="mb-1 grid grid-cols-7">
            {SHORT_DAY_NAMES.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>
        )}

        {/* Grilla de días */}
        <div
          className={cn(
            currentView === "day" ? "grid-cols-1" : "grid-cols-7",
            "grid gap-1"
          )}
          role="grid"
          aria-label="Calendario de citas"
        >
          {days.map((day, _index) => {
            const today = isSameDay(day.date, new Date());
            const dayNumber = format(day.date, "d");
            const isoDate = format(day.date, "yyyy-MM-dd");

            const appointmentCount = day.appointments.length;
            const ariaLabel = appointmentCount > 0
              ? `${appointmentCount} cita${appointmentCount > 1 ? "s" : ""} el ${format(day.date, "d 'de' MMMM", { locale: es })}`
              : format(day.date, "EEEE d 'de' MMMM", { locale: es });

            return (
              <button
                key={isoDate}
                role="gridcell"
                tabIndex={0}
                aria-label={ariaLabel}
                aria-selected={today}
                onClick={() => handleDayClick(day.date)}
                onKeyDown={(e) => handleKeyDown(e, day.date)}
                className={cn(
                  "flex flex-col items-center rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                  !day.isCurrentMonth && !today && "opacity-40",
                  today
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800",
                  currentView === "day" && "flex-row items-start gap-3 p-4"
                )}
              >
                {/* Número de día */}
                <span
                  className={cn(
                    "text-xs font-medium",
                    today ? "text-white" : "text-gray-800 dark:text-gray-200",
                    currentView === "day" && "text-lg"
                  )}
                >
                  {currentView === "day"
                    ? format(day.date, "EEEE d", { locale: es })
                    : dayNumber}
                </span>

                {/* Puntitos de colores por tipo de cita */}
                {day.types.length > 0 && (
                  <div className="mt-1 flex gap-0.5" aria-hidden="true">
                    {day.types.map((type) => (
                      <span
                        key={type}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          APPOINTMENT_DOT_COLORS[type],
                          currentView === "day" && "h-2.5 w-2.5"
                        )}
                        title={APPOINTMENT_TYPE_LABELS[type]}
                      />
                    ))}
                  </div>
                )}

                {/* Lista de citas en vista diaria */}
                {currentView === "day" && day.appointments.length > 0 && (
                  <div className="mt-1 flex-1 space-y-1" aria-hidden="true">
                    {day.appointments.map((apt: AppointmentListItem) => (
                      <div
                        key={apt.id}
                        className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <span className="font-medium">{apt.time}</span> —{" "}
                        {apt.patient.name}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-3 border-t px-4 py-3">
        {Object.entries(APPOINTMENT_DOT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {APPOINTMENT_TYPE_LABELS[type as keyof typeof APPOINTMENT_TYPE_LABELS]}
          </div>
        ))}
      </div>
    </div>
  );
}
