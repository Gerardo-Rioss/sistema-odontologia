import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { whatsappService } from "@/services/whatsapp.service";

/**
 * Manual WhatsApp message sender (admin-only).
 *
 * POST /api/whatsapp/send
 * Body: { phone: string, text: string }
 *
 * Useful for sending manual messages from the dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authentication ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Only admins can send manual messages
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden enviar mensajes manuales" },
        { status: 403 }
      );
    }

    // ── Parse body ──
    let body: { phone?: string; text?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo JSON inválido" },
        { status: 400 }
      );
    }

    const { phone, text } = body;

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json(
        { error: "El campo 'phone' es obligatorio" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "El campo 'text' es obligatorio" },
        { status: 400 }
      );
    }

    // ── Send message ──
    const result = await whatsappService.sendMessage(phone.trim(), text.trim());

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Error al enviar el mensaje",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[WhatsApp Send] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
