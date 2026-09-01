import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { slotService } from "@/services/slot.service";

/**
 * Get available appointment slots for a given date.
 *
 * GET /api/appointments/available-slots?date=YYYY-MM-DD
 *
 * Returns 1-hour time blocks from 8:00 to 18:00 (excluding 13:00-14:00 lunch).
 * Booked slots (PENDING, CONFIRMED) are marked as unavailable.
 * CANCELLED appointments free their slot.
 */
export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Parámetro 'date' requerido (formato: YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const slots = await slotService.getAvailableSlots(date, session.user.id);

  return NextResponse.json({ success: true, data: slots });
});
