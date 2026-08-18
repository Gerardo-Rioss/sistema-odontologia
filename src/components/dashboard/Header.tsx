"use client";

import { Fragment } from "react";
import Link from "next/link";
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
import { Menu, Sun, Moon, LogOut, ChevronRight, LayoutDashboard, Calendar, Users, BarChart3, Settings, Search } from "lucide-react";

const ROUTE_META: Record<string, { label: string; icon?: React.ReactNode }> = {
  "/dashboard": { label: "Dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  "/dashboard/appointments": { label: "Citas", icon: <Calendar className="h-3.5 w-3.5" /> },
  "/dashboard/patients": { label: "Pacientes", icon: <Users className="h-3.5 w-3.5" /> },
  "/dashboard/statistics": { label: "Estadísticas", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  "/dashboard/settings": { label: "Configuración", icon: <Settings className="h-3.5 w-3.5" /> },
};

function getBreadcrumbs(pathname: string, pageTitle: string | null) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((_, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const meta = ROUTE_META[href];
    // Si es el último segmento y hay un título dinámico, usarlo
    const isLast = i === segments.length - 1;
    let label = meta?.label ?? segments[i];
    if (isLast && pageTitle) label = pageTitle;
    return { label, href, icon: meta?.icon, isLast };
  });
}

export function Header() {
  const pathname = usePathname();
  const user = useStore((s) => s.user);
  const currentPageTitle = useStore((s) => s.currentPageTitle);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useTheme();

  const breadcrumbs = getBreadcrumbs(pathname, currentPageTitle);
  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      {/* Izquierda: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm sm:flex">
          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
              {!crumb.isLast ? (
                <Link
                  href={crumb.href}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-foreground">
                  {crumb.icon}
                  {crumb.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>

        {/* Título mobile */}
        {breadcrumbs.length > 0 && (
          <h2 className="text-base font-semibold sm:hidden">
            {breadcrumbs[breadcrumbs.length - 1].label}
          </h2>
        )}
      </div>

      {/* Derecha: búsqueda + usuario + dropdown */}
      <div className="flex items-center gap-3">
        {/* Botón búsqueda global (Cmd/Ctrl+K) */}
        <button
          onClick={() => document.dispatchEvent(new Event("open-command-palette"))}
          className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          aria-label="Buscar (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Buscar...</span>
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
            Ctrl K
          </kbd>
        </button>

        {user && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger data-onboarding="user-menu">
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary/50 transition-all">
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
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
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
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
