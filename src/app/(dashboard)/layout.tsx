"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { useStore } from "@/store/useStore";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Citas", href: "/dashboard/appointments", icon: "📅" },
  { label: "Pacientes", href: "/dashboard/patients", icon: "👤" },
  { label: "Estadísticas", href: "/dashboard/statistics", icon: "📈" },
  { label: "Configuración", href: "/dashboard/settings", icon: "⚙️" },
];

/**
 * Componente interno que consume useSession() y sincroniza con Zustand.
 * Debe estar dentro del árbol de SessionProvider.
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = useSession();
  const hydrateFromSession = useStore((s) => s.hydrateFromSession);
  const user = useStore((s) => s.user);

  // Sincronizar estado de NextAuth → Zustand al montar y en cada cambio de sesión
  useEffect(() => {
    hydrateFromSession(session?.user);
  }, [session, hydrateFromSession]);

  // Obtener inicial del usuario para el avatar
  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } flex flex-col bg-white shadow-lg transition-all duration-300`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <span className="text-lg font-bold text-gray-800">
              🦷 Sistema Odontología
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t p-4">
          {sidebarOpen && (
            <p className="text-xs text-gray-400">
              Sistema de Gestión Odontológica v0.1.0
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find((item) => item.href === pathname)?.label ??
              "Dashboard"}
          </h2>

          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-500">{user.name}</span>
            )}
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Notificaciones
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
              {avatarInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/**
 * Dashboard layout — sidebar fijo a la izquierda + header superior.
 * Envuelto en SessionProvider para que useSession() funcione.
 * Las páginas dentro de (dashboard) heredan este layout automáticamente.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
