"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useStore } from "@/store/useStore";

/**
 * Componente interno que consume useSession() y sincroniza con Zustand.
 * Debe estar dentro del árbol de SessionProvider.
 *
 * Responsive layout:
 * - Sidebar: fijo en escritorio (≥768px), overlay con backdrop en móvil.
 * - Header: barra superior con título detectado automáticamente.
 * - Main: scrollable, padding responsivo.
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const hydrateFromSession = useStore((s) => s.hydrateFromSession);

  // Sincronizar estado de NextAuth → Zustand al montar y en cada cambio de sesión
  useEffect(() => {
    hydrateFromSession(session?.user);
  }, [session, hydrateFromSession]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar: gestiona su propia responsividad (overlay <768px, fixed ≥768px) */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header: título + avatar + hamburguesa */}
        <Header />

        {/* Page content — padding responsivo */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

/**
 * Dashboard client layout — sidebar + header + contenido.
 *
 * Provee el árbol de providers necesario:
 * 1. QueryClientProvider (React Query) — para hooks de datos en todas las páginas.
 * 2. SessionProvider (NextAuth) — para useSession().
 *
 * Las páginas dentro de (dashboard) heredan este layout automáticamente.
 */
export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // QueryClient estable — una sola instancia por ciclo de vida del cliente.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 segundos antes de considerar stale
            retry: 1, // un solo reintento
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <DashboardContent>{children}</DashboardContent>
      </SessionProvider>
    </QueryClientProvider>
  );
}
