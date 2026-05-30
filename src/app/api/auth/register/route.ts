import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { authService } from "@/services/auth.service";
import { rateLimiter } from "@/lib/rate-limiter";

/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario con email, nombre, apellido y contraseña.
 * Aplica rate limiting (5 req / 15 min por IP) y validación Zod.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ─── Rate limiting ──────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const { allowed, resetTime } = rateLimiter.check(ip);

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Demasiados intentos. Intenta de nuevo en ${retryAfter} segundos.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // ─── Validación Zod ─────────────────────────────────────
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // ─── Registro ───────────────────────────────────────────
    const user = await authService.registerUser(parsed.data);

    return NextResponse.json(
      { success: true, data: { user } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "El correo ya está registrado") {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      );
    }

    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
