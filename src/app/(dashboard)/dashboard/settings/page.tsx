"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Building2, Bell, CalendarDays, Save, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface CalendarStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

interface ClinicForm {
  clinicName: string;
  address: string;
  city: string;
  phone: string;
  openTime: string;
  closeTime: string;
  workDays: string; // "1,2,3,4,5"
}

interface NotifForm {
  whatsappReminders: boolean;
  emailReminders: boolean;
  reminderHours: number;
}

const DEFAULT_CLINIC: ClinicForm = {
  clinicName: "",
  address: "",
  city: "",
  phone: "",
  openTime: "08:00",
  closeTime: "20:00",
  workDays: "1,2,3,4,5",
};

const DEFAULT_NOTIF: NotifForm = {
  whatsappReminders: true,
  emailReminders: false,
  reminderHours: 24,
};

const WEEK_DAYS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" },
];

/** Sección reutilizable con ícono + título + descripción. */
function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();

  // ── Google Calendar ──
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    email: null,
    lastSyncedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConnectedBanner, setShowConnectedBanner] = useState(false);

  // ── Consultorio ──
  const [clinic, setClinic] = useState<ClinicForm>(DEFAULT_CLINIC);
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicLoaded, setClinicLoaded] = useState(false);

  // ── Notificaciones ──
  const [notif, setNotif] = useState<NotifForm>(DEFAULT_NOTIF);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

  // Sync success indicator from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");
    if (calendarParam === "connected") {
      setShowConnectedBanner(true);
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  // Cargar estado del calendario
  useEffect(() => {
    if (!session?.user?.id) return;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/calendar/status");
        if (res.ok) {
          const data = await res.json();
          setCalendarStatus({
            connected: data.connected ?? false,
            email: data.email ?? null,
            lastSyncedAt: data.lastSyncedAt ?? null,
          });
        }
      } catch (err) {
        console.error("[Settings] Failed to fetch calendar status:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [session?.user?.id]);

  // Cargar configuración del consultorio
  useEffect(() => {
    if (!session?.user?.id) return;
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const d = await res.json();
          setClinic({
            clinicName: d.clinicName ?? "",
            address: d.address ?? "",
            city: d.city ?? "",
            phone: d.phone ?? "",
            openTime: d.openTime || "08:00",
            closeTime: d.closeTime || "20:00",
            workDays: d.workDays || "1,2,3,4,5",
          });
          setNotif({
            whatsappReminders: d.whatsappReminders ?? true,
            emailReminders: d.emailReminders ?? false,
            reminderHours: d.reminderHours ?? 24,
          });
        }
      } catch (err) {
        console.error("[Settings] Failed to fetch settings:", err);
      } finally {
        setClinicLoaded(true);
        setNotifLoaded(true);
      }
    }
    fetchSettings();
  }, [session?.user?.id]);

  // ── Handlers ──

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (res.ok) {
        setCalendarStatus({ connected: false, email: null, lastSyncedAt: null });
      }
    } catch (err) {
      console.error("[Settings] Disconnect failed:", err);
    } finally {
      setDisconnecting(false);
    }
  };

  const saveClinic = useCallback(async () => {
    setSavingClinic(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clinic),
      });
      if (res.ok) {
        toast.success("Datos del consultorio guardados");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión al guardar");
    } finally {
      setSavingClinic(false);
    }
  }, [clinic]);

  const saveNotif = useCallback(async () => {
    setSavingNotif(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notif),
      });
      if (res.ok) {
        toast.success("Preferencias de notificación guardadas");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión al guardar");
    } finally {
      setSavingNotif(false);
    }
  }, [notif]);

  const toggleWorkDay = (value: string) => {
    setClinic((prev) => {
      const days = prev.workDays ? prev.workDays.split(",").filter(Boolean) : [];
      const idx = days.indexOf(value);
      if (idx >= 0) days.splice(idx, 1);
      else days.push(value);
      days.sort((a, b) => Number(a) - Number(b));
      return { ...prev, workDays: days.join(",") };
    });
  };

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return "Nunca";
    const date = new Date(iso);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configuración</h1>

      {/* ── Connected Banner ─────────────────────────────────── */}
      {showConnectedBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-emerald-700 dark:text-emerald-400">✓</span>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Google Calendar conectado exitosamente
            </p>
          </div>
        </div>
      )}

      {/* ── Google Calendar ──────────────────────────────────── */}
      <SettingsCard
        icon={<CalendarDays className="h-5 w-5" />}
        title="Google Calendar"
        description="Sincronizá tus citas con Google Calendar automáticamente."
      >
        <div className="mt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando estado...
            </div>
          ) : calendarStatus.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Conectado
                </span>
                {calendarStatus.email && (
                  <span className="text-sm text-muted-foreground">
                    — {calendarStatus.email}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Última sincronización: {formatLastSync(calendarStatus.lastSyncedAt)}
              </p>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  "Desconectar"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-3 w-3 rounded-full bg-muted-foreground/30" />
                <span className="text-sm font-medium text-muted-foreground">
                  No conectado
                </span>
              </div>

              <a
                href="/api/calendar/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Conectar Google Calendar
              </a>

              <p className="text-xs text-muted-foreground">
                Al conectar, se sincronizarán automáticamente tus citas con Google Calendar.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* ── Datos del Consultorio ────────────────────────────── */}
      <SettingsCard
        icon={<Stethoscope className="h-5 w-5" />}
        title="Datos del Consultorio"
        description="Nombre, dirección, teléfono y horarios de atención."
      >
        {!clinicLoaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="clinicName">Nombre del consultorio</Label>
                <Input
                  id="clinicName"
                  value={clinic.clinicName}
                  onChange={(e) => setClinic({ ...clinic, clinicName: e.target.value })}
                  placeholder="Ej: Centro Odontológico Ríos"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clinicPhone">Teléfono</Label>
                <Input
                  id="clinicPhone"
                  type="tel"
                  value={clinic.phone}
                  onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
                  placeholder="+54 9 362 000-0000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clinicAddress">Dirección</Label>
                <Input
                  id="clinicAddress"
                  value={clinic.address}
                  onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                  placeholder="Calle y número"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clinicCity">Ciudad</Label>
                <Input
                  id="clinicCity"
                  value={clinic.city}
                  onChange={(e) => setClinic({ ...clinic, city: e.target.value })}
                  placeholder="Ej: Resistencia, Chaco"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="openTime">Apertura</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={clinic.openTime}
                  onChange={(e) => setClinic({ ...clinic, openTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="closeTime">Cierre</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={clinic.closeTime}
                  onChange={(e) => setClinic({ ...clinic, closeTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Días laborables */}
            <div>
              <Label>Días de atención</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = clinic.workDays
                    .split(",")
                    .filter(Boolean)
                    .includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWorkDay(day.value)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveClinic} disabled={savingClinic}>
                {savingClinic ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar consultorio
              </Button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* ── Preferencias de Notificación ─────────────────────── */}
      <SettingsCard
        icon={<Bell className="h-5 w-5" />}
        title="Preferencias de Notificación"
        description="Configurá cómo y cuándo querés recibir recordatorios."
      >
        {!notifLoaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Recordatorios por WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Enviar recordatorios de citas automáticamente.
                  </p>
                </div>
              </div>
              <Switch
                checked={notif.whatsappReminders}
                onCheckedChange={(v) => setNotif({ ...notif, whatsappReminders: v })}
                aria-label="Recordatorios por WhatsApp"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Recordatorios por email</p>
                  <p className="text-xs text-muted-foreground">
                    Enviar confirmaciones y recordatorios por correo.
                  </p>
                </div>
              </div>
              <Switch
                checked={notif.emailReminders}
                onCheckedChange={(v) => setNotif({ ...notif, emailReminders: v })}
                aria-label="Recordatorios por email"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Anticipación del recordatorio</p>
                  <p className="text-xs text-muted-foreground">
                    ¿Con cuántas horas de anticipación avisar?
                  </p>
                </div>
              </div>
              <select
                value={notif.reminderHours}
                onChange={(e) => setNotif({ ...notif, reminderHours: Number(e.target.value) })}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                aria-label="Horas de anticipación"
              >
                <option value={2}>2 horas</option>
                <option value={6}>6 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
                <option value={48}>48 horas</option>
              </select>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveNotif} disabled={savingNotif}>
                {savingNotif ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar preferencias
              </Button>
            </div>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
