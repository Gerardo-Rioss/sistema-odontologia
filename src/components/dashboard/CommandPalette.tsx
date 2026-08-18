"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { Users, CalendarDays, Search, CornerDownLeft } from "lucide-react";
import { formatShortDate, formatTime } from "@/lib/formatters";
import type { AppointmentListItem } from "@/types";

/**
 * Paleta de búsqueda global (Cmd/Ctrl+K).
 * Busca pacientes por nombre/email/teléfono y citas por paciente.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const { data: patients = [] } = usePatients(query || undefined);
  const { data: appointments = [] } = useAppointments();

  // Atajo global Cmd/Ctrl+K + evento custom desde el botón del header
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openFromButton = () => setOpen(true);
    document.addEventListener("keydown", down);
    document.addEventListener("open-command-palette", openFromButton);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-palette", openFromButton);
    };
  }, []);

  const filteredAppointments = React.useMemo(() => {
    if (!query.trim()) return appointments.slice(0, 5);
    const q = query.toLowerCase();
    return appointments
      .filter((a) => a.patient.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [appointments, query]);

  const goTo = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-xl">
        <CommandInput
          placeholder="Buscar pacientes, citas..."
          value={query}
          onValueChange={setQuery}
          data-testid="command-input"
        />
        <CommandList>
          <CommandEmpty>Sin resultados para &quot;{query}&quot;</CommandEmpty>

          {patients.length > 0 && (
            <CommandGroup heading="Pacientes">
              {patients.slice(0, 6).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => goTo(`/dashboard/patients/${p.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.phone && (
                    <span className="text-xs text-muted-foreground">{p.phone}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredAppointments.length > 0 && (
            <CommandGroup heading="Citas">
              {filteredAppointments.map((a: AppointmentListItem) => (
                <CommandItem
                  key={a.id}
                  value={`${a.patient.name} ${a.date} ${a.time}`}
                  onSelect={() => goTo("/dashboard/appointments")}
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{a.patient.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatShortDate(a.date)} · {formatTime(a.time)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && (
            <div className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" />
              <span>Enter para navegar</span>
              <Search className="ml-3 h-3 w-3" />
              <span>Ctrl+K para abrir</span>
            </div>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
