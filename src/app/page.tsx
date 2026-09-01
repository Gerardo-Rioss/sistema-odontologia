import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  BarChart3,
  Smile,
  MessageCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  GitBranch,
} from "lucide-react";

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
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Citas",
    description:
      "Agendá, modificá y cancelá turnos con un clic. Sincronización bidireccional con Google Calendar.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Pacientes",
    description:
      "Historial completo, datos de contacto y ficha clínica digital por paciente.",
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "WhatsApp",
    description:
      "Recordatorios automáticos y confirmaciones de asistencia vía WhatsApp Business API.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Estadísticas",
    description:
      "Ingresos, tasa de cancelación, tendencias y métricas del consultorio en tiempo real.",
  },
];

const highlights = [
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Acceso seguro",
    description: "Autenticación por roles, sesiones JWT y cifrado de datos sensibles.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Rápido y moderno",
    description: "Next.js 14 + React 18 + Tailwind CSS, con dark mode incluido.",
  },
  {
    icon: <Smile className="h-4 w-4" />,
    title: "Pensado para el consultorio",
    description: "Interfaz en español, diseñada para odontólogos y asistentes.",
  },
];

// Mockup del dashboard para el hero (SVG inline, sin imágenes externas)
function DashboardPreview() {
  const stats = [
    { label: "Citas hoy", value: "8", color: "bg-teal-500" },
    { label: "Pacientes", value: "142", color: "bg-emerald-500" },
    { label: "Completadas", value: "86%", color: "bg-violet-500" },
    { label: "Cancelación", value: "4%", color: "bg-rose-500" },
  ];
  const rows = [
    { name: "María González", time: "09:00", type: "Limpieza", dot: "bg-teal-500" },
    { name: "Jorge Benítez", time: "10:30", type: "Tratamiento", dot: "bg-sky-500" },
    { name: "Lucía Fernández", time: "12:00", type: "Urgencia", dot: "bg-amber-500" },
    { name: "Carlos Sosa", time: "15:30", type: "Revisión", dot: "bg-indigo-500" },
  ];
  return (
    <div className="rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          dashboard · resumen del consultorio
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-xs font-semibold">Próximas citas</p>
          <span className="text-[10px] text-primary">Ver todas →</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
            <span className={`h-2 w-2 rounded-full ${r.dot}`} />
            <span className="flex-1 truncate text-xs font-medium">{r.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{r.time}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {r.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Smile className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Sistema Odontológico</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Funciones</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Cómo funciona</a>
            <a href="#stack" className="transition-colors hover:text-foreground">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Smile className="h-3.5 w-3.5 text-primary" />
            Gestión integral para tu consultorio
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tu consultorio odontológico,{" "}
            <span className="text-gradient">bajo control</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Automatizá tus citas, gestioná pacientes y sincronizá tu calendario
            desde un solo lugar. Diseñado para consultorios que quieren trabajar
            sin papeles.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border bg-card px-8 py-3 font-medium text-foreground transition hover:bg-accent active:scale-[0.98] sm:w-auto"
            >
              Probar demo
            </Link>
          </div>
        </div>

        {/* Preview del producto */}
        <div className="mx-auto mt-14 max-w-4xl sm:mt-20">
          <DashboardPreview />
        </div>

        {/* ── Funciones ── */}
        <section id="features" className="mt-20 scroll-mt-16 sm:mt-28">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Todo lo que tu consultorio necesita
            </h2>
            <p className="mt-2 text-muted-foreground">
              Un solo sistema para administrar el día a día.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {feat.icon}
                </div>
                <h3 className="font-semibold">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section id="como-funciona" className="mt-20 scroll-mt-16 sm:mt-28">
          <div className="rounded-2xl border bg-card p-8 shadow-sm sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Hecho para odontólogos, no para ingenieros
              </h2>
              <p className="mt-2 text-muted-foreground">
                Simple de aprender, rápido de usar, listo para producción.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {highlights.map((h) => (
                <div key={h.title} className="text-center sm:text-left">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mx-0">
                    {h.icon}
                  </div>
                  <h3 className="mt-3 font-semibold">{h.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stack tecnológico ── */}
        <section id="stack" className="mt-20 scroll-mt-16 sm:mt-28">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Stack tecnológico
            </h2>
            <p className="mt-2 text-muted-foreground">
              Construido con las mejores herramientas del ecosistema web moderno.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              "Next.js 14",
              "React 18",
              "TypeScript",
              "Tailwind CSS",
              "Prisma",
              "PostgreSQL",
              "NextAuth.js",
              "React Query",
              "Zustand",
              "Zod",
              "Framer Motion",
              "Recharts",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-full border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="mt-20 text-center sm:mt-28">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            ¿Listo para digitalizar tu consultorio?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Empezá hoy. Configurá tu consultorio en menos de 5 minutos.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.98]"
          >
            Crear cuenta gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Smile className="h-4 w-4" />
            </span>
            Sistema Odontológico
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sistema de Gestión Odontológica · Next.js + TypeScript
          </p>
          <a
            href="https://github.com/Gerardo-Rioss/sistema-odontologia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <GitBranch className="h-4 w-4" />
            Open source
          </a>
        </div>
      </footer>
    </div>
  );
}
