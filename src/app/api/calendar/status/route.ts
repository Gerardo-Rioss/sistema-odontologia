import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Returns the current user's Google Calendar connection status.
 *
 * GET /api/calendar/status
 * - If connected: { connected: true, email, lastSyncedAt }
 * - If not:     { connected: false }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const connection = await calendarRepository.findByUserId(session.user.id);

    if (!connection || connection.status !== "ACTIVE") {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: connection.googleEmail ?? null,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[CalendarStatus] GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
