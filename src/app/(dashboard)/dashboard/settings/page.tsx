"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      {/* ── Connected Banner ─────────────────────────────────── */}
      {showConnectedBanner && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">✓</span>
            <p className="text-sm font-medium text-green-800">
              Google Calendar conectado exitosamente
            </p>
          </div>
        </div>
      )}

      {/* ── Google Calendar Section ──────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Google Calendar
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Sincronizá tus citas con Google Calendar automáticamente.
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              Cargando estado...
            </div>
          ) : calendarStatus.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700">
                  Conectado
                </span>
                {calendarStatus.email && (
                  <span className="text-sm text-gray-500">
                    — {calendarStatus.email}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Última sincronización:{" "}
                {formatLastSync(calendarStatus.lastSyncedAt)}
              </p>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disconnecting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
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
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-300" />
                <span className="text-sm font-medium text-gray-500">
                  No conectado
                </span>
              </div>

              <a
                href="/api/calendar/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm6.225 12.525h-5.7v5.7h-1.05v-5.7h-5.7v-1.05h5.7v-5.7h1.05v5.7h5.7v1.05z" />
                </svg>
                Conectar Google Calendar
              </a>

              <p className="text-xs text-gray-400">
                Al conectar, se sincronizarán automáticamente tus citas
                con Google Calendar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Clinic Data Section ──────────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Datos del Consultorio
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Nombre, dirección, teléfono y horarios de atención.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          La configuración estará disponible próximamente.
        </p>
      </div>

      {/* ── Notification Preferences ──────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Preferencias de Notificación
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Configurá cómo y cuándo querés recibir notificaciones.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Las notificaciones se habilitarán en una fase futura.
        </p>
      </div>
    </div>
  );
}
