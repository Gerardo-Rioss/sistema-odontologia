import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { whatsappMessaging } from "@/services/whatsapp-messaging.service";

/**
 * Manual WhatsApp message sender (admin-only).
 *
 * POST /api/whatsapp/send
 * Body: { phone: string, text: string }
 *
 * Useful for sending manual messages from the dashboard.
 */
export const POST = withAuth(
  async (request, { session }) => {
    // Only admins can send manual messages
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden enviar mensajes manuales" },
        { status: 403 }
      );
    }

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

    const result = await whatsappMessaging.sendMessage(phone.trim(), text.trim());

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
  },
  { roles: ["ADMIN"] }
);
