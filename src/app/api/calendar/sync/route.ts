import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
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
export const POST = withAuth(async (request, { session }) => {
  const result = await calendarService.catchUpSync(session.user.id);
  return NextResponse.json({ success: true, data: result });
});

export const GET = withAuth(async (request, { session }) => {
  const connection = await calendarRepository.findByUserId(session.user.id);
  const connected = !!(connection && connection.status === "ACTIVE");

  return NextResponse.json({
    connected,
    lastSync: connection?.lastSyncedAt?.toISOString() ?? null,
    calendarEmail: connection?.googleEmail ?? null,
  });
});
