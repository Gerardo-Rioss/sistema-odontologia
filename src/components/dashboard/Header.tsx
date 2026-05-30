"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/appointments": "Citas",
  "/dashboard/patients": "Pacientes",
  "/dashboard/statistics": "Estadísticas",
  "/dashboard/settings": "Configuración",
};

/**
 * Barra superior del dashboard.
 *
 * - Título de página detectado automáticamente desde la ruta.
 * - Avatar del usuario + nombre desde el store de Zustand.
 * - Botón de cerrar sesión (signOut de next-auth).
 * - Botón hamburguesa para abrir/cerrar el sidebar en móvil.
 */
export function Header() {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";

  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      {/* Lado izquierdo: menú hamburguesa + título */}
      <div className="flex items-center gap-3">
        {/* Toggle sidebar (móvil) */}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden"
          aria-label="Abrir menú"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Título de página */}
        <h2 className="text-lg font-semibold text-gray-800">{pageTitle}</h2>
      </div>

      {/* Lado derecho: usuario + cerrar sesión */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden text-sm text-gray-500 sm:inline">
            {user.name}
          </span>
        )}

        {/* Avatar */}
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm text-white",
            user ? "bg-blue-600" : "bg-gray-400"
          )}
          aria-label={user ? `Usuario: ${user.name}` : "Usuario no identificado"}
        >
          {avatarInitial}
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleSignOut}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
          aria-label="Cerrar sesión"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
