import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Users, BarChart3, Smile } from "lucide-react";

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

const features = [
  {
    icon: <CalendarDays className="h-8 w-8" />,
    title: "Citas",
    description: "Agendá, modificá y cancelá turnos con un clic. Sincronización con Google Calendar.",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Pacientes",
    description: "Historial completo, datos de contacto y recordatorios automáticos vía WhatsApp.",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Estadísticas",
    description: "Ingresos, tasa de cancelación, tendencias y métricas del consultorio en tiempo real.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="max-w-2xl text-center">
        {/* Hero */}
        <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
          <Smile className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Sistema de Gestión Odontológica
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Automatizá tus citas, gestioná pacientes y sincronizá tu calendario
          desde un solo lugar. Diseñado para consultorios que quieren trabajar
          sin papeles.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground shadow transition hover:bg-primary/90 active:scale-[0.98]"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl border border-primary px-8 py-3 font-medium text-primary transition hover:bg-primary/10 active:scale-[0.98]"
          >
            Registrarse
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="rounded-xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 text-primary">{feat.icon}</div>
              <h3 className="font-semibold text-foreground">{feat.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
