import { handlers } from "@/lib/auth";

/**
 * NextAuth.js API route — delegamos todo a la configuración centralizada en lib/auth.ts.
 * GET /api/auth/[...nextauth] — maneja sign-in, sign-out, session, CSRF, etc.
 * POST /api/auth/[...nextauth] — maneja sign-in con credenciales.
 */
export const { GET, POST } = handlers;
