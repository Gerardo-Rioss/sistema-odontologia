import type { Metadata } from "next";
import DashboardClientLayout from "./DashboardClientLayout";

/**
 * Dashboard server layout — exporta metadata para SEO.
 *
 * El renderizado y providers del lado cliente están en DashboardClientLayout.tsx
 * para que este archivo sea un Server Component y pueda usar la Metadata API.
 *
 * Las páginas dentro de (dashboard) heredan este layout automáticamente.
 */
export const metadata: Metadata = {
  title: {
    template: "%s | Sistema Odontológico",
    default: "Panel | Sistema Odontológico",
  },
  description:
    "Panel de gestión del consultorio odontológico — citas, pacientes, estadísticas y configuración.",
  openGraph: {
    title: "Panel | Sistema Odontológico",
    description:
      "Panel de gestión del consultorio odontológico — citas, pacientes, estadísticas y configuración.",
    type: "website",
    locale: "es_AR",
    siteName: "Sistema Odontológico",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
