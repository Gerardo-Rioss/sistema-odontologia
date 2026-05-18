export { auth as middleware } from "@/lib/auth";

/**
 * NextAuth v5 middleware — protege rutas del dashboard y APIs sensibles.
 *
 * Rutas en el matcher requieren autenticación:
 * - /dashboard/* → redirige a /login si no hay sesión
 * - /api/appointments/* → protege la API de citas
 * - /api/patients/* → protege la API de pacientes
 *
 * Rutas públicas (NO en el matcher):
 * - /, /api/auth/*, /login, /register, /api/whatsapp/*, /api/calendar/*
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/appointments/:path*",
    "/api/patients/:path*",
  ],
};
