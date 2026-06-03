import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sistema de Gestión Odontológica",
  description:
    "Plataforma integral para la administración de consultorios odontológicos. Gestión de citas, pacientes, calendario y estadísticas.",
  openGraph: {
    title: "Sistema de Gestión Odontológica",
    description:
      "Plataforma integral para la administración de consultorios odontológicos.",
    type: "website",
    locale: "es_AR",
    siteName: "Sistema Odontológico",
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-foreground">
          Sistema de Gestión Odontológica
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Automatizá tus citas, gestioná pacientes y sincronizá tu calendario
          desde un solo lugar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow transition hover:bg-primary/90"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-primary px-6 py-3 font-medium text-primary transition hover:bg-primary/10"
          >
            Registrarse
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-foreground">📅 Citas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Agendá, modificá y cancelá turnos con un clic.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-foreground">👥 Pacientes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Historial completo y datos de contacto centralizados.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-foreground">📊 Estadísticas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresos, tasa de cancelación y tendencias en gráficos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
