import { NextResponse } from "next/server";

/**
 * Webhook de WhatsApp Business API.
 * GET /api/whatsapp/webhook — verificación del webhook (Meta).
 * POST /api/whatsapp/webhook — recepción de mensajes entrantes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // TODO: Validar verify_token contra WHATSAPP_VERIFY_TOKEN en producción
  if (mode === "subscribe" && token && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { message: "Verificación de webhook fallida" },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json({
    message: "WhatsApp Webhook — próximamente",
  });
}
