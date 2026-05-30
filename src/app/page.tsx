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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-gray-950">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Sistema de Gestión Odontológica
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Automatizá tus citas, gestioná pacientes y sincronizá tu calendario
          desde un solo lugar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow transition hover:bg-blue-700"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-blue-600 px-6 py-3 font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            Registrarse
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold">📅 Citas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Agendá, modificá y cancelá turnos con un clic.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold">👥 Pacientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Historial completo y datos de contacto centralizados.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold">📊 Estadísticas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Ingresos, tasa de cancelación y tendencias en gráficos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
