"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";

interface CalendarStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

/**
 * Application settings page.
 *
 * Sections:
 * - Google Calendar: connect/disconnect, view connection status.
 * - Clinic Data (placeholder).
 * - Notification Preferences (placeholder).
 */
export default function SettingsPage() {
  const { data: session } = useSession();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    email: null,
    lastSyncedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Sync success indicator from OAuth redirect
  const [showConnectedBanner, setShowConnectedBanner] = useState(false);

  useEffect(() => {
    // Check URL query param for calendar connection result
    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");
    if (calendarParam === "connected") {
      setShowConnectedBanner(true);
      // Clean the URL without reloading
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

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

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (res.ok) {
        setCalendarStatus({
          connected: false,
          email: null,
          lastSyncedAt: null,
        });
      }
    } catch (err) {
      console.error("[Settings] Disconnect failed:", err);
    } finally {
      setDisconnecting(false);
    }
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
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/50">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-green-700 dark:text-green-400">✓</span>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Google Calendar conectado exitosamente
            </p>
          </div>
        </div>
      )}

      {/* ── Google Calendar Section ──────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Google Calendar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sincronizá tus citas con Google Calendar automáticamente.
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando estado...
            </div>
          ) : calendarStatus.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Conectado
                </span>
                {calendarStatus.email && (
                  <span className="text-sm text-muted-foreground">
                    — {calendarStatus.email}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Última sincronización:{" "}
                {formatLastSync(calendarStatus.lastSyncedAt)}
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
                Al conectar, se sincronizarán automáticamente tus citas
                con Google Calendar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Clinic Data Section ──────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Datos del Consultorio
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nombre, dirección, teléfono y horarios de atención.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          La configuración estará disponible próximamente.
        </p>
      </div>

      {/* ── Notification Preferences ──────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Preferencias de Notificación
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configurá cómo y cuándo querés recibir notificaciones.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Las notificaciones se habilitarán en una fase futura.
        </p>
      </div>
    </div>
  );
}
