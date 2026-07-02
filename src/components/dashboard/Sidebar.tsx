"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  Smile,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/Tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Citas", href: "/dashboard/appointments", icon: <CalendarDays className="h-5 w-5" /> },
  { label: "Pacientes", href: "/dashboard/patients", icon: <Users className="h-5 w-5" /> },
  { label: "Estadísticas", href: "/dashboard/statistics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Configuración", href: "/dashboard/settings", icon: <Settings className="h-5 w-5" /> },
];

/**
 * Barra lateral de navegación del dashboard.
 *
 * - Usa lucide-react para íconos consistentes con shadcn.
 * - En móvil usa shadcn Sheet para overlay.
 * - En escritorio es fijo y colapsable.
 */
export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card text-card-foreground shadow-lg">
      {/* Cabecera */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen && (
          <span className="flex items-center gap-2 text-lg font-bold">
            <Smile className="h-5 w-5" />
            Odontología
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform duration-300",
              sidebarOpen ? "" : "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 p-2" role="navigation" data-onboarding="sidebar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn("flex-shrink-0", sidebarOpen && "mr-3")}>
                {item.icon}
              </span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );

          // En modo colapsado, envolver con tooltip
          if (!sidebarOpen) {
            return (
              <Tooltip key={item.href} content={item.label} side="right">
                {link}
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Pie */}
      <div className="border-t p-4">
        {sidebarOpen && (
          <p className="text-xs text-muted-foreground">
            Sistema de Gestión Odontológica v0.1.0
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:flex-shrink-0 transition-all duration-300",
          sidebarOpen ? "md:w-64" : "md:w-20"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar as Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
