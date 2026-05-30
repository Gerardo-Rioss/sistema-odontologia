import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations";
import { authService } from "@/services/auth.service";
import { rateLimiter } from "@/lib/rate-limiter";

/**
 * POST /api/auth/reset-password
 *
 * Restablece la contraseña usando un token de recuperación.
 * El token debe ser válido (no expirado ni usado previamente).
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
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // ─── Restablecer contraseña ─────────────────────────────
    await authService.resetPassword(parsed.data.token, parsed.data.password);

    return NextResponse.json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Token inválido o expirado" ||
        error.message === "Token expirado" ||
        error.message === "Token ya utilizado"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
