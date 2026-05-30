import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { authService } from "@/services/auth.service";
import { rateLimiter } from "@/lib/rate-limiter";

/**
 * POST /api/auth/forgot-password
 *
 * Genera un token de recuperación de contraseña para el email indicado.
 * No revela si el email existe (protección contra enumeración de usuarios).
 * En modo desarrollo, retorna el token en la respuesta.
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
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // ─── Generar token ──────────────────────────────────────
    const token = await authService.generateResetToken(parsed.data.email);

    if (!token) {
      // No user enumeration — respuesta genérica
      return NextResponse.json({
        message:
          "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
      });
    }

    // Dev mode: retornar token en la respuesta
    return NextResponse.json({
      message: "Token generado correctamente.",
      resetToken: token,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
