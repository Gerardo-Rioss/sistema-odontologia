import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Disconnects the user's Google Calendar integration.
 *
 * POST /api/calendar/disconnect
 * - Verifies the user is authenticated.
 * - Deletes the CalendarConnection from the database.
 * - Returns 200 on success (even if no connection existed — idempotent).
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Delete by userId (idempotent — fine if none exists)
    const connection = await calendarRepository.findByUserId(session.user.id);
    if (connection) {
      await calendarRepository.delete(connection.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CalendarDisconnect] POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
