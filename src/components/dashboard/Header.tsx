"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useStore } from "@/store/useStore";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Sun, Moon, LogOut } from "lucide-react";

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
 * - Usa lucide-react para íconos.
 * - DropdownMenu para usuario con toggle de tema y logout.
 * - Avatar de shadcn para foto de usuario.
 */
export function Header() {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useTheme();

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";
  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 text-card-foreground shadow-sm">
      {/* Izquierda: hamburger + título */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold">{pageTitle}</h2>
      </div>

      {/* Derecha: usuario + dropdown */}
      <div className="flex items-center gap-2">
        {user && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
