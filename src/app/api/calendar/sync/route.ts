import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calendarService } from "@/services/calendar.service";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Manual calendar sync trigger and health status endpoint.
 *
 * POST /api/calendar/sync
 * - Triggers a bidirectional catch-up sync (catchUpSync) for the user.
 * - Returns the SyncResult describing what was synced.
 *
 * GET /api/calendar/sync
 * - Returns the connection health status: connected state, last sync time.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await calendarService.catchUpSync(session.user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[CalendarSync] POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const connection = await calendarRepository.findByUserId(session.user.id);

    const connected = !!(connection && connection.status === "ACTIVE");

    return NextResponse.json({
      connected,
      lastSync: connection?.lastSyncedAt?.toISOString() ?? null,
      calendarEmail: connection?.googleEmail ?? null,
    });
  } catch (error) {
    console.error("[CalendarSync] GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
