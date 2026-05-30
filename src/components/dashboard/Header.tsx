"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";

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
  const { theme, setTheme } = useTheme();

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";

  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Lado izquierdo: menú hamburguesa + título */}
      <div className="flex items-center gap-3">
        {/* Toggle sidebar (móvil) */}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h2>
      </div>

      {/* Lado derecho: usuario + cerrar sesión */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden text-sm text-gray-500 sm:inline dark:text-gray-400">
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

        {/* Toggle theme */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleSignOut}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
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
