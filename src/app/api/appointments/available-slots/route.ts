import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { whatsappService } from "@/services/whatsapp.service";

/**
 * Get available appointment slots for a given date.
 *
 * GET /api/appointments/available-slots?date=YYYY-MM-DD
 *
 * Returns 1-hour time blocks from 8:00 to 18:00 (excluding 13:00-14:00 lunch).
 * Booked slots (PENDING, CONFIRMED) are marked as unavailable.
 * CANCELLED appointments free their slot.
 */
export async function GET(request: NextRequest) {
  try {
    // ── Authentication ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ── Parse query param ──
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Parámetro 'date' requerido (formato: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // ── Get available slots ──
    const slots = await whatsappService.getAvailableSlots(
      date,
      session.user.id
    );

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error("GET /api/appointments/available-slots error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
